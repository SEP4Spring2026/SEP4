# IoT DevOps (MQTT local stack)

This folder contains a small containerized stack for the IoT side:

- `mqtt-broker`: local MQTT broker (Mosquitto) on port `1883`
- `mqtt-debug-subscriber`: prints all payloads from `iot/readings`
- `mqtt-http-bridge`: forwards `iot/readings` payloads to backend `POST /api/readings`

On the VPS (`docker-compose.vps.yml`), **MainServer** also publishes ML-derived alarms on **`iot/alarm/{sensorId}`** (payloads `CRITICAL`, `WARN`, `OFF`) when `ALARM_MQTT_HOST` is set. Firmware subscribes to that topic and drives the buzzer.

## Run

From `System/IoT_foundation/devops`:

```bash
docker compose -f docker-compose.iot.yml up -d
```

To view incoming payloads:

```bash
docker logs -f sep4-mqtt-debug-subscriber
```

To view forwarding to backend:

```bash
docker logs -f sep4-mqtt-http-bridge
```

## Stop

```bash
docker compose -f docker-compose.iot.yml down
```

## Firmware alignment

In `src/IoT_sensor_readings_feature/main.c` keep:

- `MQTT_BROKER_PORT` as `1883`
- `MQTT_TOPIC` as `iot/readings`
- `LOCAL_DEVICE_ID` must match `iot/alarm/{id}` subscription (built automatically from `LOCAL_DEVICE_ID`)

For local testing, set `MQTT_BROKER_HOST` to the machine running Docker
(for example your laptop LAN IP).

## End-to-end local flow

- IoT publishes to `mqtt-broker` topic `iot/readings`
- `mqtt-http-bridge` consumes that topic
- bridge forwards JSON to `http://host.docker.internal:8080/api/readings`
- backend stores reading, frontend then shows updates
