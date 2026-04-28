# SEP4

#Prerequisites

Install Graphviz: https://graphviz.org/download/

Install Pandoc

Install the following extensions:

- PlantUML
- Markdown PDF

# IoT Sensor Data (for Frontend, Backend, ML)

The IoT module reads:
- CO2 (ppm)
- Temperature (C)
- Humidity (%)

It builds this JSON payload:
`{"co2":420,"temp":23.4,"hum":45.1}`

How to use this in other teams:
- Frontend: show these 3 values in the UI (cards/chart/live monitor).
- Backend: receive/store the JSON payload and expose it with API endpoints.
- ML: use time-series of `co2`, `temp`, and `hum` for training and predictions.

RabbitMQ (short flow):
- IoT publishes each JSON payload to a RabbitMQ queue.
- Backend consumes queue messages and writes them to the database.
- Frontend/ML read data later from backend APIs/database.

Current source files:
- `System/IoT_foundation/lib/Drivers/sensors.h`
- `System/IoT_foundation/lib/Drivers/sensors.c`
- `System/IoT_foundation/src/IoT_sensor_readings_feature/main.c`
