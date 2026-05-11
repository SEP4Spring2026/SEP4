from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _payload(temperature, humidity, co2Level, tvoc=28, eco2=410, aqi=1, classification="Normal"):
    return {
        "sensorId": 102,
        "timestamp": "2026-04-08T12:15:00Z",
        "sensors": {
            "temperature": temperature,
            "humidity": humidity,
            "co2Level": co2Level,
            "tvoc": tvoc,
            "eco2": eco2,
            "aqi": aqi,
        },
        "classification": classification,
    }


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_normal_conditions():
    response = client.post("/predict", json=_payload(22.0, 50.0, 400.0))
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Normal"
    assert body["riskLevel"] == "Low"


def test_predict_high_co2_triggers_fire():
    response = client.post("/predict", json=_payload(22.0, 50.0, 2500.0))
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Fire"
    assert body["riskLevel"] == "High"


def test_predict_high_temperature_triggers_fire():
    response = client.post("/predict", json=_payload(65.0, 50.0, 400.0))
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Fire"


def test_predict_dry_humidity_is_warning():
    response = client.post("/predict", json=_payload(22.0, 10.0, 400.0))
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Warning"
    assert body["riskLevel"] == "Medium"


def test_predict_co2_warning_band():
    response = client.post("/predict", json=_payload(22.0, 50.0, 1500.0))
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Warning"


def test_predict_aqi_unhealthy_triggers_fire():
    response = client.post("/predict", json=_payload(22.0, 50.0, 400.0, aqi=5))
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Fire"


def test_predict_aqi_moderate_is_warning():
    response = client.post("/predict", json=_payload(22.0, 50.0, 400.0, aqi=3))
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Warning"


def test_predict_rejects_legacy_flat_payload():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 50.0, "co2Level": 400.0},
    )
    assert response.status_code == 422
