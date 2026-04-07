## - How should we split the responsibilities between the teams?

#### 

## - What data is send between the various parts of the system?

#### The IoT team sends sensors data to the ML team, who sends the predictions and relevant information to the frontend team.

## - What is the format of the data? How is it sent?

#### The device will send the information to the backend through MQTT, the backend will send the information to the frontend through gRPC for efficency and the frontend will provide REST endpoint that the clients will access.

## - How frequently is the data updated?

#### The data must be updated every 2 min, since a fire can take a few minutes to became hazardous.

## - Do you need to mock parts of the system early on or will real data be available?

#### We will mock sensors data until we get reliable data through the measuring device.