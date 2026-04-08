## - How should we split the responsibilities between the teams?

#### The team responsabilities are splited based on the porpuse of each team. The IoT team is responsible of creating the IoT device and share relevant data with the ML team. The ML team is responsible of providing the business logic, accurate predictions and sending the processed data to the frontend team. The frontend team is responsible of providing a user friendly app experience and display the processed data to the user.

## - What data is send between the various parts of the system?

#### The IoT team sends sensors data to the ML team, who sends the predictions and relevant information to the frontend team.

## - What is the format of the data? How is it sent?

#### The device will send the information to the backend through MQTT, the backend will send the information to the frontend through gRPC for efficency and the frontend will provide REST endpoint that the clients will access.

## - How frequently is the data updated?

#### The data must be updated every 2 minutes, since a fire can take a few minutes to become life threatening.

## - Do you need to mock parts of the system early on or will real data be available?

#### We will mock sensors data until we get reliable data through the measuring device.