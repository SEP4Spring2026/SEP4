from datetime import datetime
from typing import Optional

from fastapi import FastAPI
from pydantic import BaseModel, Field

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


# Thresholds → riskLevel returned to MainServer → MQTT iot/alarm/{sensorId}:
#   High   → payload CRITICAL (buzzer pattern on board)
#   Medium → WARN only if ALARM_PUBLISH_MEDIUM=true on MainServer
#   Low    → OFF (silence buzzer)
CO2_WARNING = 1000
CO2_DANGER = 2000
TEMP_WARNING = 40
TEMP_DANGER = 60
HUMIDITY_DRY = 20
AQI_WARNING = 3
AQI_DANGER = 5


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=Prediction)
def predict(reading: Reading):
    s = reading.sensors
    danger = 0
    warning = 0

    if s.co2Level >= CO2_DANGER:
        danger += 1
    elif s.co2Level >= CO2_WARNING:
        warning += 1

    if s.temperature >= TEMP_DANGER:
        danger += 1
    elif s.temperature >= TEMP_WARNING:
        warning += 1

    if s.humidity <= HUMIDITY_DRY:
        warning += 1

    if s.aqi >= AQI_DANGER:
        danger += 1
    elif s.aqi >= AQI_WARNING:
        warning += 1

    if danger > 0:
        return Prediction(
            predictedCategory="Fire",
            confidenceScore=1.0,
            riskLevel="High",
        )
    if warning > 0:
        return Prediction(
            predictedCategory="Warning",
            confidenceScore=1.0,
            riskLevel="Medium",
        )
    return Prediction(
        predictedCategory="Normal",
        confidenceScore=1.0,
        riskLevel="Low",
    )
