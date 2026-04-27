from fastapi.testclient import TestClient

from main import app

client = TestClient(app)


def test_health_returns_ok():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_predict_normal_conditions():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 50.0, "co2Level": 400.0},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Normal"
    assert body["riskLevel"] == "Low"


def test_predict_high_co2_triggers_fire():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 50.0, "co2Level": 2500.0},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Fire"
    assert body["riskLevel"] == "High"


def test_predict_high_temperature_triggers_fire():
    response = client.post(
        "/predict",
        json={"temperature": 65.0, "humidity": 50.0, "co2Level": 400.0},
    )
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Fire"


def test_predict_dry_humidity_is_warning():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 10.0, "co2Level": 400.0},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["predictedCategory"] == "Warning"
    assert body["riskLevel"] == "Medium"


def test_predict_co2_warning_band():
    response = client.post(
        "/predict",
        json={"temperature": 22.0, "humidity": 50.0, "co2Level": 1500.0},
    )
    assert response.status_code == 200
    assert response.json()["predictedCategory"] == "Warning"
