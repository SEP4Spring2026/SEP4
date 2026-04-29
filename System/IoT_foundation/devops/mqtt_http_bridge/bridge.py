import json
import os
import time

import paho.mqtt.client as mqtt
import requests


MQTT_HOST = os.getenv("MQTT_HOST", "mqtt-broker")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC = os.getenv("MQTT_TOPIC", "iot/readings")
BACKEND_URL = os.getenv("BACKEND_URL", "http://host.docker.internal:8080/api/readings")


def on_connect(client, userdata, flags, reason_code, properties=None):
    print(f"[BRIDGE] Connected to MQTT ({MQTT_HOST}:{MQTT_PORT}) rc={reason_code}", flush=True)
    client.subscribe(MQTT_TOPIC, qos=0)
    print(f"[BRIDGE] Subscribed to topic '{MQTT_TOPIC}'", flush=True)


def on_message(client, userdata, msg):
    payload = msg.payload.decode("utf-8", errors="replace")
    print(f"[BRIDGE] RX {msg.topic}: {payload}", flush=True)

    try:
        data = json.loads(payload)
    except json.JSONDecodeError as exc:
        print(f"[BRIDGE] Invalid JSON, skipping: {exc}", flush=True)
        return

    try:
        response = requests.post(BACKEND_URL, json=data, timeout=10)
        print(f"[BRIDGE] POST {BACKEND_URL} -> {response.status_code}", flush=True)
    except Exception as exc:
        print(f"[BRIDGE] HTTP error: {exc}", flush=True)


def main():
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.on_connect = on_connect
    client.on_message = on_message

    while True:
        try:
            client.connect(MQTT_HOST, MQTT_PORT, keepalive=60)
            client.loop_forever()
        except Exception as exc:
            print(f"[BRIDGE] MQTT connection error: {exc}", flush=True)
            time.sleep(3)


if __name__ == "__main__":
    main()
