"""Forge a realistic "first day of deployment" baseline for the drift monitor.

WHY
---
The training data (merged_dataset.xlsx) is ~68% Fire because it is dominated by
online lab fire datasets collected specifically to STUDY fire. A real kitchen is
the opposite: almost always Normal, sometimes Cooking, very rarely Fire. Using
that fire-heavy training set as the drift baseline would make drift_monitor.py
report drift every single day even when nothing is wrong, because deployment data
will never look like the training mix.

So this script builds a baseline that represents NORMAL DEPLOYMENT instead:
it samples real per-class readings from merged_dataset (each class therefore keeps
its true sensor signature) but re-mixes them to realistic kitchen proportions and
adds small sensor-level noise so the rows are new, not exact copies of training
rows.

IMPORTANT: the output (first_day_baseline.xlsx) is SYNTHETIC. It is only used as
the *reference distribution* for drift_monitor.py — it is not training data and
not a record of real measurements.

Run:  .venv-ml\\Scripts\\python.exe make_first_day_baseline.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent
SOURCE = HERE / "merged_dataset.xlsx"
OUT = HERE / "first_day_baseline.xlsx"

FEATURES = ["temperature", "humidity", "tvoc_ppb", "eco2_ppm"]

# Realistic kitchen mix: mostly Normal, some Cooking, rare Fire — the inverse of
# the training set. Tweak these if your environment differs.
MIX = {"Normal": 0.75, "Cooking": 0.20, "Fire": 0.05}

TOTAL = 17_280            # one day of readings at one every 5 seconds (24h)
NOISE_FRAC = 0.10         # jitter each value by 10% of its class's per-feature std
RNG = np.random.RandomState(42)

INT_COLS = {"tvoc_ppb", "eco2_ppm"}   # match merged_dataset's integer channels
# Soft physical limits so jitter can't produce impossible sensor values.
CLIP = {
    "temperature": (10, None),
    "humidity": (0, 100),
    "tvoc_ppb": (0, None),
    "eco2_ppm": (400, None),
}


def main() -> None:
    df = pd.read_excel(SOURCE)

    parts = []
    for label, frac in MIX.items():
        n = round(TOTAL * frac)
        pool = df[df["label"] == label]
        take = pool.sample(n=min(n, len(pool)), replace=len(pool) < n, random_state=RNG).copy()
        # add small, class-aware noise so these are NEW rows, still realistic
        for col in FEATURES:
            std = pool[col].std() or 0.0
            take[col] = take[col] + RNG.normal(0.0, NOISE_FRAC * std, len(take))
        parts.append(take)

    out = pd.concat(parts, ignore_index=True)

    # clip + round so it looks like genuine sensor output
    for col, (lo, hi) in CLIP.items():
        out[col] = out[col].clip(lower=lo, upper=hi)
    out["temperature"] = out["temperature"].round(2)
    out["humidity"] = out["humidity"].round(1)
    for col in INT_COLS:
        out[col] = out[col].round().astype(int)

    out = out.sample(frac=1, random_state=RNG).reset_index(drop=True)   # shuffle
    out = out[["temperature", "humidity", "tvoc_ppb", "eco2_ppm", "label", "class_id"]]
    out.to_excel(OUT, index=False)

    print(f"Wrote {OUT}  ({len(out):,} rows)")
    print("Class mix:")
    print(out["label"].value_counts(normalize=True).round(3).to_string())


if __name__ == "__main__":
    main()
