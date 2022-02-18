# PLUTUS API


## Requirements

- Docker: v20.10.12

- Docker Compose: v1.29.2



### Local Testing

- NodeJS: v16.13.1

- NPM: v8.1.2

- PostgreSQL: v14

- Python: v3.7




#
## Getting Started

Navigate to the compose project and start the containers with:

`docker-compose up --build -d`

In order to enable the test mode, run the following:

`testMode=true docker-compose up --build -d`






#
## Tests

#

End-to-end: 

`docker exec api docker-entrypoint.sh npm test`

Auth: 

`docker exec api docker-entrypoint.sh npm run test-auth`

Candlestick: 

`docker exec api docker-entrypoint.sh npm run test-candlestick`

Database: 

`docker exec api docker-entrypoint.sh npm run test-db`

GUI Version: 

`docker exec api docker-entrypoint.sh npm run test-gui-version`

Notification: 

`docker exec api docker-entrypoint.sh npm run test-notification`

Server: 

`docker exec api docker-entrypoint.sh npm run test-server`

Trading Simulation: 

`docker exec api docker-entrypoint.sh npm run test-trading-simulation`

Utilities: 

`docker exec api docker-entrypoint.sh npm run test-utils`




#
# API ERRORS


## Binance (1 - 999)

1: ``



#
## Candlestick (1.000 - 1.999)

1000: `The Binance API should have returned at least 1 candlestick.`

### Model

1200: `A valid list of candlesticks is required in order to invoke saveCandlesticks.`

### Validations

1300: `The provided start (${start}) and|or end (${end}) timestamps are not valid numbers.`

1301: `The end (${end}) timestamp must be greater than the start (${start}) timestamp.`

1302: `The provided minutes interval (${intervalMinutes}) is invalid.`


#
## Database (2.000 - 2.999)

2000: ``




#
## External Request (3.000 - 3.999)

3000: ``




#
## Forecast (4.000 - 4.999)

4000: ``




#
## Utilities (5.000 - 5.999)

5000: ``





#
## Server (6.000 - 6.999)

6000: ``

### Validations

6300: `The alarms configuration must be a valid object.`

6301: `The maxFileSystemUsage must be a number ranging 30-99, instead received: ${alarms.maxFileSystemUsage}`

6302: `The maxMemoryUsage must be a number ranging 30-99, instead received: ${alarms.maxMemoryUsage}`

6303: `The maxCPULoad must be a number ranging 30-99, instead received: ${alarms.maxCPULoad}`

6304: `The maxCPUTemperature must be a number ranging 50-90, instead received: ${alarms.maxCPUTemperature}`

6305: `The maxGPULoad must be a number ranging 30-99, instead received: ${alarms.maxGPULoad}`

6306: `The maxGPUTemperature must be a number ranging 50-120, instead received: ${alarms.maxGPUTemperature}`

6307: `The maxGPUMemoryTemperature must be a number ranging 50-90, instead received: ${alarms.maxGPUMemoryTemperature}`



#
## GUI Version (7.000 - 7.999)

7000: `The provided version (${newVersion}) has an invalid format.`



#
## Auth (8.000 - 8.999)

8000: ``


### Model

8300: ``


### Validations

8300: ``


#
## API Secret (9.000 - 9.999)

9000: `A list of valid uids must be provided in order to refresh the api secrets.`

9001: `A valid secrets object must be provided in order to update the local secrets.`

9002: `The uid (${uid}) was not found in the local secrets object.`

9003: `The uid (${uid}) provided an api secret with an invalid format: ${secret}.`

9004: `The uid (${uid}) provided an api secret that didnt match the one stored locally: ${secret}.`