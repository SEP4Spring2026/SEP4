from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def _payload(temperature, humidity, tvoc, eco2, co2Level=400.0, aqi=1, classification="Normal"):
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


def test_predict_response_shape():
    response = client.post("/predict", json=_payload(22.0, 40.0, 100.0, 400.0))
    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"predictedCategory", "confidenceScore", "riskLevel"}
    assert body["predictedCategory"] in {"Normal", "Cooking", "Fire"}
    assert body["riskLevel"] in {"Low", "Medium", "High"}
    assert 0.0 <= body["confidenceScore"] <= 1.0


def test_predict_normal_baseline():
    # Clean room: cool, moderate humidity, low TVOC and eCO2.
    response = client.post("/predict", json=_payload(22.0, 40.0, 100.0, 400.0))
    body = response.json()
    assert body["predictedCategory"] == "Normal"
    assert body["riskLevel"] == "Low"


def test_predict_cooking_profile():
    # Warm + humid kitchen with mid-range TVOC and elevated eCO2 — the IoT
    # team's labeled cooking samples sit in this band.
    response = client.post("/predict", json=_payload(28.0, 60.0, 800.0, 1200.0))
    body = response.json()
    assert body["predictedCategory"] == "Cooking"
    assert body["riskLevel"] == "Medium"


def test_predict_fire_profile():
    # Hot + very dry + elevated gas readings — Blattmann smoke-event regime.
    response = client.post("/predict", json=_payload(38.0, 15.0, 1000.0, 8000.0))
    body = response.json()
    assert body["predictedCategory"] == "Fire"
    assert body["riskLevel"] == "High"


def test_predict_ignores_unused_threshold_signals():
    # The model only consumes temperature, humidity, tvoc, eco2.
    # co2Level + aqi spikes alone must not flip a clean reading to Fire/Cooking.
    response = client.post(
        "/predict",
        json=_payload(22.0, 40.0, 100.0, 400.0, co2Level=5000.0, aqi=5),
    )
    body = response.json()
    assert body["predictedCategory"] == "Normal"
    assert body["riskLevel"] == "Low"


def test_predict_rejects_legacy_flat_payload():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 50.0, "co2Level": 400.0},
    )
    assert response.status_code == 422


def test_predict_rejects_aqi_below_minimum():
    payload = _payload(22.0, 40.0, 100.0, 400.0)
    payload["sensors"]["aqi"] = 0
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_rejects_aqi_above_maximum():
    payload = _payload(22.0, 40.0, 100.0, 400.0)
    payload["sensors"]["aqi"] = 6
    response = client.post("/predict", json=payload)
    assert response.status_code == 422


def test_predict_rejects_missing_required_sensor_field():
    payload = _payload(22.0, 40.0, 100.0, 400.0)
    del payload["sensors"]["humidity"]
    response = client.post("/predict", json=payload)
    assert response.status_code == 422
