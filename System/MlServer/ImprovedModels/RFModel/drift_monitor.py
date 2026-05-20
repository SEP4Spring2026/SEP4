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
                         drifting away from what it produced on the training data?
  * Feature drift     -- are the raw sensor inputs drifting? (explains *why*)

This script compares a REFERENCE batch (the training data the model learned from)
against a CURRENT batch (recent / logged production readings) using deepchecks,
writes an interactive HTML report, and exits non-zero if any drift condition
fails -- so it can be run on a schedule and gate an alert.

It is a research/ops tool: it is NOT imported by the FastAPI server (main.py) and
its dependencies live in ImprovedModels/requirements-ml.txt, never in the runtime
image.

USAGE
-----
    python drift_monitor.py --current <batch.csv|batch.xlsx>
    python drift_monitor.py --current logs.xlsx --reference merged_dataset.xlsx --out reports

The CURRENT file only needs the four feature columns (no labels required):
    temperature, humidity, tvoc_ppb, eco2_ppm

Exit code: 0 = all drift conditions passed, 1 = drift detected (or error).
"""

from __future__ import annotations

import argparse
import sys
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
    """A small, output-focused drift suite with pass/fail conditions."""
    return Suite(
        "RF deployed drift monitor",
        # PRIMARY: drift in the model's predicted-class distribution (its output).
        PredictionDrift().add_condition_drift_score_less_than(pred_threshold),
        # DIAGNOSTIC: per-feature input drift -- explains *why* the output drifted.
        FeatureDrift().add_condition_drift_score_less_than(),
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument(
        "--current",
        required=True,
        type=Path,
        help="Production / logged readings to check (.csv or .xlsx).",
    )
    parser.add_argument(
        "--reference",
        type=Path,
        default=HERE / "merged_dataset.xlsx",
        help="Training-data baseline (default: ./merged_dataset.xlsx).",
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
    current = require_features(load_table(args.current), args.current)

    # deepchecks calls the baseline "train" and the batch under test "test".
    ref_ds = Dataset(reference, cat_features=[])
    cur_ds = Dataset(current, cat_features=[])

    result = build_suite(args.pred_threshold).run(
        train_dataset=ref_ds, test_dataset=cur_ds, model=pipe
    )

    args.out.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_path = args.out / f"drift_report_{stamp}.html"
    result.save_as_html(str(report_path))

    passed = result.passed(fail_if_warning=False)
    print(f"\nReference : {args.reference}  ({len(reference):,} rows)")
    print(f"Current   : {args.current}  ({len(current):,} rows)")
    print(f"Report    : {report_path}")
    print(f"Result    : {'PASS - no significant drift' if passed else 'FAIL - drift detected'}")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
