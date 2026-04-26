from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()


class Reading(BaseModel):
    temperature: float
    humidity: float
    co2Level: float


class Prediction(BaseModel):
    predictedCategory: str
    confidenceScore: float
    riskLevel: str


CO2_WARNING = 1000
CO2_DANGER = 2000
TEMP_WARNING = 40
TEMP_DANGER = 60
HUMIDITY_DRY = 20


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/predict", response_model=Prediction)
def predict(reading: Reading):
    danger = 0
    warning = 0

    if reading.co2Level >= CO2_DANGER:
        danger += 1
    elif reading.co2Level >= CO2_WARNING:
        warning += 1

    if reading.temperature >= TEMP_DANGER:
        danger += 1
    elif reading.temperature >= TEMP_WARNING:
        warning += 1

    if reading.humidity <= HUMIDITY_DRY:
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
