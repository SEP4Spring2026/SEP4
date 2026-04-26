## - How should we split the responsibilities between the teams?

#### The team responsabilities are splited based on the purpose of each team. The IoT team is responsible of creating the IoT device and share relevant data with the ML team. The ML team is responsible of providing the business logic, accurate predictions and sending the processed data to the frontend team. The frontend team is responsible of providing a user friendly app experience and display the processed data to the user.

## - What data is send between the various parts of the system?

#### The IoT team sends sensors data to the ML team, who sends the predictions and user relevant information to the frontend team.

## - What is the format of the data? How is it sent?

#### The device will send the information to the backend through MQTT, the backend will send the information to the frontend through gRPC (protobuf) for efficency and the frontend will provide REST (JSON) endpoint that the clients will access.

### - Data payload example: 
### {
###  "device_id": "sensor_denmark_01",
###  "timestamp": "2026-04-08T12:15:00Z",
### "sensors": {
###    "temperature": 24.5,
###    "humidity": 45.2,
###    "smoke_density": 120,
###    "gas_lpg": 15
###  },
###  "status": "normal"
### }

## - How frequently is the data updated?

#### The data update will be implemented through a dual-rate strategy in which there will be two modes. The normal mode where the data will be updated every 1 minute. And an active mode where data is updated every 15 seconds. The active mode is activated when the sensor detects a sudden spike in temperature and other features TBD. This ensures that the ML model receives critical important data, Frontend displays accurate live data while preserving energy efficiency of the device and not overhelming the ML model with frequent unecessary identical data.

## - Do you need to mock parts of the system early on or will real data be available?

#### We will mock sensors data until we get reliable data through the measuring device.