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

app = FastAPI()


class Sensors(BaseModel):
    temperature: float = Field(..., description="Temperature in degrees Celsius")
    humidity: float = Field(..., description="Relative humidity, percent")
    co2Level: float = Field(..., description="CO2 concentration, ppm")
    tvoc: float = Field(..., description="Total Volatile Organic Compounds, ppb")
    eco2: float = Field(..., description="Estimated CO2, ppm")
    aqi: int = Field(
        ...,
        ge=1,
        le=5,
        description="Air Quality Index, 1=Excellent..5=Unhealthy",
    )


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
