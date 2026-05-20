"""Label-free drift monitor for the deployed Random Forest fire-detection model.

WHY THIS EXISTS
---------------
ML models fail silently: a degraded model keeps returning confident-but-wrong
predictions and nothing crashes. Once the IoT system is live in a real kitchen,
the incoming sensor data slowly drifts away from what the model trained on
(different sensor unit, environment, season) and the model quietly gets worse.

In production there are no ground-truth labels (nobody confirms a reading was
*really* a fire), so we cannot measure precision/recall live. The label-free
equivalent is DRIFT:

  * Prediction drift  -- is the mix of predicted classes (the model's OUTPUT)
                         drifting from the normal-deployment baseline?  [PASS/FAIL gate]
  * Feature drift     -- are the raw sensor inputs drifting? (diagnostic only)

This script compares a REFERENCE batch (first_day_baseline.xlsx -- a snapshot of
NORMAL DEPLOYMENT, mostly Normal/Cooking with rare Fire) against a CURRENT batch
(recent / logged production readings) using deepchecks, writes an interactive HTML
report, and exits non-zero if any drift condition fails -- so it can be run on a
schedule and gate an alert.

Note: we deliberately do NOT baseline against the training data (merged_dataset),
which is ~68% Fire and unrepresentative of a real kitchen -- doing so would flag
drift every day. See make_first_day_baseline.py.

It is a research/ops tool: it is NOT imported by the FastAPI server (main.py) and
its dependencies live in ImprovedModels/requirements-ml.txt, never in the runtime
image.

USAGE
-----
One-shot (check a single batch and exit):
    python drift_monitor.py --current <batch.csv|batch.xlsx>
    python drift_monitor.py --current logs.xlsx --reference first_day_baseline.xlsx --out reports

Watch (auto-trigger a check every N new rows in a growing log):
    python drift_monitor.py --watch <log.csv> --batch-size 1000
    # the FastAPI server (main.py) appends each prediction to drift_data/incoming.csv;
    # point --watch at that file and a drift check fires for every full batch of 1000.

The CURRENT/log file only needs the four feature columns (no labels required):
    temperature, humidity, tvoc_ppb, eco2_ppm   (aliases tvoc/eco2 accepted)

Exit code: 0 = all drift conditions passed, 1 = drift detected (or error).
(In --watch mode the exit code reflects the LAST batch checked.)
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import warnings
from datetime import datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.pipeline import Pipeline

from deepchecks.tabular import Dataset, Suite
from deepchecks.tabular.checks import FeatureDrift, PredictionDrift

# Kept identical to ImprovedModels/RFModel/rf_model.ipynb so the monitor sees the
# model exactly as it was trained.
FEATURES = ["temperature", "humidity", "tvoc_ppb", "eco2_ppm"]

# The deployed server (main.py) receives sensor payloads that spell two of these
# features differently (tvoc, eco2). Production logs therefore use those names,
# so accept either spelling when reading a "current" batch.
FEATURE_ALIASES = {"tvoc": "tvoc_ppb", "eco2": "eco2_ppm"}

HERE = Path(__file__).resolve().parent


def load_table(path: Path) -> pd.DataFrame:
    """Read a .csv or .xlsx into a DataFrame."""
    if path.suffix.lower() in {".xlsx", ".xls"}:
        return pd.read_excel(path)
    if path.suffix.lower() == ".csv":
        return pd.read_csv(path)
    raise ValueError(f"Unsupported file type: {path} (use .csv or .xlsx)")


def require_features(df: pd.DataFrame, source: Path) -> pd.DataFrame:
    """Return just the model features, accepting production payload aliases."""
    df = df.rename(
        columns={a: f for a, f in FEATURE_ALIASES.items() if a in df.columns and f not in df.columns}
    )
    missing = [c for c in FEATURES if c not in df.columns]
    if missing:
        raise ValueError(
            f"{source} is missing required feature column(s): {missing}\n"
            f"Expected columns {FEATURES} (aliases accepted: {FEATURE_ALIASES})"
        )
    return df[FEATURES].copy()


def build_pipeline(model_path: Path, scaler_path: Path) -> Pipeline:
    """Wrap the saved scaler + model so deepchecks can predict on RAW features."""
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    return Pipeline([("scaler", scaler), ("rf", model)])


def build_suite(pred_threshold: float) -> Suite:
    """Drift suite for the deployed model.

    The PASS/FAIL gate is *prediction drift* (the model's output) only. Feature
    drift is included for diagnosis but carries NO condition: per-feature
    Kolmogorov-Smirnov on heavy-tailed sensor data (eco2/tvoc) is too sensitive to
    finite-sample noise and would false-alarm on perfectly normal days. It still
    appears in the HTML report so a human can see *which* input drifted when the
    gate does trip.
    """
    return Suite(
        "RF deployed drift monitor",
        # GATE: drift in the model's predicted-class distribution (its output).
        PredictionDrift().add_condition_drift_score_less_than(pred_threshold),
        # DIAGNOSTIC ONLY (no condition): per-feature input drift.
        FeatureDrift(),
    )


def run_check(reference, current, pipe, out_dir: Path, pred_threshold: float) -> tuple[bool, Path]:
    """Run the drift suite for one (reference, current) pair, save the HTML report.

    `reference`/`current` are feature-only DataFrames (see require_features).
    Returns (passed, report_path).
    """
    # deepchecks calls the baseline "train" and the batch under test "test".
    ref_ds = Dataset(reference, cat_features=[])
    cur_ds = Dataset(current, cat_features=[])

    result = build_suite(pred_threshold).run(
        train_dataset=ref_ds, test_dataset=cur_ds, model=pipe
    )

    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    report_path = out_dir / f"drift_report_{stamp}.html"
    result.save_as_html(str(report_path))

    return result.passed(fail_if_warning=False), report_path


def record_history(out_dir: Path, start: int, end: int, passed: bool, report_path: Path) -> None:
    """Append one line per checked batch so drift over time is auditable."""
    history = out_dir / "drift_history.csv"
    out_dir.mkdir(parents=True, exist_ok=True)
    new = not history.exists()
    with history.open("a", encoding="utf-8") as fh:
        if new:
            fh.write("checked_at,row_start,row_end,result,report\n")
        status = "PASS" if passed else "FAIL"
        fh.write(f"{datetime.now().isoformat()},{start},{end},{status},{report_path.name}\n")


def watch_log(args, pipe, reference) -> int:
    """Tail a growing log file; fire a drift check for every full batch of new rows.

    A tiny JSON state file records how many rows have already been consumed, so the
    watcher is idempotent and resumable: restarting it never re-checks an old batch,
    and rows are never mutated (the pointer just advances).
    """
    state_path = args.watch.parent / f".{args.watch.stem}_drift_state.json"
    processed = 0
    if state_path.exists():
        try:
            processed = int(json.loads(state_path.read_text()).get("processed", 0))
        except (ValueError, OSError, json.JSONDecodeError):
            processed = 0

    print(f"Watching   : {args.watch}")
    print(f"Reference  : {args.reference}  ({len(reference):,} rows)")
    print(f"Batch size : {args.batch_size}   (already consumed: {processed:,} rows)")
    print(f"Poll every : {args.poll_interval}s   (Ctrl-C to stop)" if not args.once else "Mode       : --once (drain available batches, then exit)")

    last_passed = True
    while True:
        if args.watch.exists():
            df = load_table(args.watch)
            while len(df) - processed >= args.batch_size:
                batch = df.iloc[processed: processed + args.batch_size]
                current = require_features(batch, args.watch)
                last_passed, report_path = run_check(
                    current=current, reference=reference, pipe=pipe,
                    out_dir=args.out, pred_threshold=args.pred_threshold,
                )
                start, end = processed, processed + args.batch_size
                record_history(args.out, start, end, last_passed, report_path)
                processed = end
                state_path.write_text(json.dumps({"processed": processed}))
                verdict = "PASS - no significant drift" if last_passed else "FAIL - drift detected"
                print(f"[{datetime.now():%H:%M:%S}] rows {start:,}-{end:,}: {verdict}  ->  {report_path.name}")

        if args.once:
            break
        time.sleep(args.poll_interval)

    return 0 if last_passed else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    src = parser.add_mutually_exclusive_group(required=True)
    src.add_argument(
        "--current",
        type=Path,
        help="One-shot: production / logged readings to check (.csv or .xlsx).",
    )
    src.add_argument(
        "--watch",
        type=Path,
        help="Watch mode: a growing log file; auto-checks every --batch-size new rows.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=1000,
        help="Watch mode: fire a drift check every this many new rows (default: 1000).",
    )
    parser.add_argument(
        "--poll-interval",
        type=float,
        default=10.0,
        help="Watch mode: seconds between checks for new rows (default: 10).",
    )
    parser.add_argument(
        "--once",
        action="store_true",
        help="Watch mode: process all full batches available now, then exit (no polling).",
    )
    parser.add_argument(
        "--reference",
        type=Path,
        default=HERE / "first_day_baseline.xlsx",
        help="Normal-deployment baseline (default: ./first_day_baseline.xlsx). "
             "Swap in a real logged 'normal operation' window once you have one.",
    )
    parser.add_argument("--model", type=Path, default=HERE / "model_rf.joblib")
    parser.add_argument("--scaler", type=Path, default=HERE / "scaler.joblib")
    parser.add_argument(
        "--out",
        type=Path,
        default=HERE / "reports",
        help="Directory for the HTML report (default: ./reports).",
    )
    parser.add_argument(
        "--pred-threshold",
        type=float,
        default=0.15,
        help="Max allowed prediction-drift score, PSI (default: 0.15).",
    )
    args = parser.parse_args()

    # sklearn warns because the scaler was fitted on a numpy array (no feature
    # names) but we feed it a DataFrame; the version-mismatch note is also benign.
    warnings.filterwarnings("ignore")

    pipe = build_pipeline(args.model, args.scaler)
    reference = require_features(load_table(args.reference), args.reference)

    if args.watch is not None:
        try:
            return watch_log(args, pipe, reference)
        except KeyboardInterrupt:
            print("\nStopped.")
            return 0

    current = require_features(load_table(args.current), args.current)
    passed, report_path = run_check(
        current=current, reference=reference, pipe=pipe,
        out_dir=args.out, pred_threshold=args.pred_threshold,
    )
    print(f"\nReference : {args.reference}  ({len(reference):,} rows)")
    print(f"Current   : {args.current}  ({len(current):,} rows)")
    print(f"Report    : {report_path}")
    print(f"Result    : {'PASS - no significant drift' if passed else 'FAIL - drift detected'}")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
