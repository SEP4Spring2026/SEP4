# MainServer Black-Box Testing Proof

## Overview

Black-box testing was performed against the running containerized system.

The tests called MainServer only through public HTTP endpoints. No internal
classes, methods, or services were called directly.

The main endpoint tested was:

```http
POST /api/readings
```

This endpoint was tested with three sensor profiles:

- Normal
- Cooking
- Fire

The responses were verified, and persisted rows were confirmed in MySQL.

## Environment

The full containerized system was running during the test:

- MainServer
- MLServer
- MySQL
- MQTT broker
- MQTT HTTP bridge
- Frontend

MainServer was tested from outside the application through:

```text
http://localhost:8080
```

MLServer was running at:

```text
http://localhost:8000
```

## Health Check Evidence

Request:

```http
GET http://localhost:8080/health
```

Actual response:

```json
{
  "status": "ok"
}
```

## Test Case 1: Normal Sensor Profile

Request:

```http
POST http://localhost:8080/api/readings
Content-Type: application/json
```

Sensor ID:

```text
9001
```

Actual response:

```text
predictedCategory = Normal
riskLevel = Low
confidenceScore = 0.84
```

Result:

```text
Passed
```

## Test Case 2: Cooking Sensor Profile

Request:

```http
POST http://localhost:8080/api/readings
Content-Type: application/json
```

Sensor ID:

```text
9002
```

Actual response:

```text
predictedCategory = Cooking
riskLevel = Medium
confidenceScore = 0.85
```

Result:

```text
Passed
```

## Test Case 3: Fire Sensor Profile

Request:

```http
POST http://localhost:8080/api/readings
Content-Type: application/json
```

Sensor ID:

```text
9003
```

Actual response:

```text
predictedCategory = Fire
riskLevel = High
confidenceScore = 0.63
```

Result:

```text
Passed
```

## Database Verification

After the HTTP tests, the persisted rows were verified in MySQL.

Result:

| SensorId | Classification | PredictedCategory | RiskLevel | ConfidenceScore |
|---:|---|---|---|---:|
| 9001 | Blackbox-Normal | Normal | Low | 0.84 |
| 9002 | Blackbox-Cooking | Cooking | Medium | 0.85 |
| 9003 | Blackbox-Fire | Fire | High | 0.63 |

## Conclusion

The black-box test passed.

The test confirms that:

- MainServer was reachable through its public HTTP API.
- `POST /api/readings` accepted valid sensor payloads.
- MainServer communicated with MLServer internally.
- MLServer returned predictions for Normal, Cooking, and Fire profiles.
- MainServer returned the predictions to the HTTP client.
- MainServer persisted both readings and predictions in MySQL.

Black-box testing did not require new source code. This document records the
manual test evidence so the result can be reviewed later in the repository.

