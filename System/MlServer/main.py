from datetime import datetime
from pathlib import Path
from typing import Optional

import joblib
import numpy as np
from fastapi import FastAPI
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent

# Container build copies the joblib files to `model/` (see Dockerfile).
# Dev runs read them straight from the training folder.
MODEL_DIRS = [BASE_DIR / "model", BASE_DIR / "Felipe's model"]
MODEL_FILE = "model_random_forest.joblib"
SCALER_FILE = "scaler.joblib"

# Trained features, order is load-bearing — must match scaler.fit_transform input.
FEATURE_ORDER = ("temperature", "humidity", "tvoc", "eco2")

# Class id -> labels returned to MainServer.
# riskLevel drives the MQTT buzzer (see AlarmMqttPublisher.MapRiskToPayload):
#   High   -> CRITICAL
#   Medium -> WARN (only if ALARM_PUBLISH_MEDIUM=true)
#   Low    -> OFF
CATEGORY_BY_CLASS = {0: "Normal", 1: "Cooking", 2: "Fire"}
RISK_BY_CLASS = {0: "Low", 1: "Medium", 2: "High"}


def _load_artifacts():
    for directory in MODEL_DIRS:
        model_path = directory / MODEL_FILE
        scaler_path = directory / SCALER_FILE
        if model_path.is_file() and scaler_path.is_file():
            return joblib.load(model_path), joblib.load(scaler_path)
    searched = ", ".join(str(d) for d in MODEL_DIRS)
    raise FileNotFoundError(
        f"Could not locate {MODEL_FILE} + {SCALER_FILE} in any of: {searched}"
    )


_model, _scaler = _load_artifacts()

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

    return Prediction(
        predictedCategory=CATEGORY_BY_CLASS.get(class_id, "Unknown"),
        confidenceScore=confidence,
        riskLevel=RISK_BY_CLASS.get(class_id, "Low"),
    )
