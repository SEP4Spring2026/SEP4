import csv
import os
from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
MODEL_DIR = BASE_DIR / "model"
MODEL_FILE = "model_random_forest.joblib"
SCALER_FILE = "scaler.joblib"

# Drift-monitor feed: every prediction's RAW features get appended here so the
# label-free drift monitor (ImprovedModels/RFModel/drift_monitor.py --watch) has a
# growing "current" batch to compare against the baseline. Plain CSV via the stdlib
# only — deepchecks must NEVER be imported here (it needs numpy<2 / sklearn 1.7.x,
# which conflicts with this server's runtime). The monitor runs in .venv-ml instead.
DRIFT_LOG_ENABLED = os.getenv("DRIFT_LOG_ENABLED", "1") != "0"
DRIFT_LOG_PATH = Path(os.getenv("DRIFT_LOG_PATH", str(BASE_DIR / "drift_data" / "incoming.csv")))
# tvoc/eco2 use the production payload spelling; the monitor aliases them to
# tvoc_ppb/eco2_ppm to match the model's training feature names.
DRIFT_LOG_COLUMNS = (
    "timestamp", "sensorId", "temperature", "humidity", "tvoc", "eco2",
    "predictedCategory", "confidence",
)

# Trained features, order is load-bearing — must match scaler.fit_transform input.
FEATURE_ORDER = ("temperature", "humidity", "tvoc", "eco2")

# Class id -> labels returned to MainServer.
# MainServer maps predictedCategory to MQTT: Fire -> CRITICAL; Normal/Cooking -> OFF.
# riskLevel is informational for dashboards.
CATEGORY_BY_CLASS = {0: "Normal", 1: "Cooking", 2: "Fire"}
RISK_BY_CLASS = {0: "Low", 1: "Medium", 2: "High"}


def _load_artifacts():
    model_path = MODEL_DIR / MODEL_FILE
    scaler_path = MODEL_DIR / SCALER_FILE
    if not (model_path.is_file() and scaler_path.is_file()):
        raise FileNotFoundError(
            f"Could not locate {MODEL_FILE} + {SCALER_FILE} in {MODEL_DIR}"
        )
    return joblib.load(model_path), joblib.load(scaler_path)


_model, _scaler = _load_artifacts()


def _log_for_drift(reading: "Reading", prediction: "Prediction") -> None:
    """Append one raw-feature row to the drift feed. Best-effort: a logging failure
    must never break a prediction, so all errors are swallowed."""
    if not DRIFT_LOG_ENABLED:
        return
    try:
        DRIFT_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        write_header = not DRIFT_LOG_PATH.exists()
        s = reading.sensors
        with DRIFT_LOG_PATH.open("a", newline="", encoding="utf-8") as fh:
            writer = csv.writer(fh)
            if write_header:
                writer.writerow(DRIFT_LOG_COLUMNS)
            writer.writerow([
                reading.timestamp.isoformat(),
                reading.sensorId,
                s.temperature,
                s.humidity,
                s.tvoc,
                s.eco2,
                prediction.predictedCategory,
                prediction.confidenceScore,
            ])
    except Exception:
        # Drift logging is observability, not a hard dependency of /predict.
        pass


app = FastAPI()


class Sensors(BaseModel):
    temperature: float = Field(..., description="Temperature in degrees Celsius")
    humidity: float = Field(..., description="Relative humidity, percent")
    co2Level: float = Field(..., description="CO2 concentration, ppm")
    tvoc: float = Field(..., description="Total Volatile Organic Compounds, ppb")
    eco2: float = Field(..., description="Estimated CO2, ppm")
    aqi: int = Field(..., ge=1, le=5, description="Air Quality Index, 1=Excellent..5=Unhealthy")


class Reading(BaseModel):
    sensorId: int
    timestamp: datetime
    sensors: Sensors
    classification: Optional[str] = None


class Prediction(BaseModel):
    predictedCategory: str
    confidenceScore: float
    riskLevel: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=Prediction)
def predict(reading: Reading):
    s = reading.sensors
    features = np.array(
        [[getattr(s, name) for name in FEATURE_ORDER]],
        dtype=float,
    )
    scaled = _scaler.transform(features)

    probabilities = _model.predict_proba(scaled)[0]
    best_index = int(np.argmax(probabilities))
    class_id = int(_model.classes_[best_index])
    confidence = float(probabilities[best_index])

    prediction = Prediction(
        predictedCategory=CATEGORY_BY_CLASS.get(class_id, "Unknown"),
        confidenceScore=confidence,
        riskLevel=RISK_BY_CLASS.get(class_id, "Low"),
    )
    _log_for_drift(reading, prediction)
    return prediction
