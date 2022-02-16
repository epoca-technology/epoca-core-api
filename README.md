# PLUTUS CORE API


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

1) Install dependencies with `npm install` 

2) Build the project with `npm run build` 

3) Navigate to the compose project and start the containers with `docker-compose up --build -d`




#
## Build

Run `npm run build` to perform a gulp build



#
## Server

Run `npm start` to run the server




#
## Tests

When running unit tests, it is important that the containers are initialized with the correct configuration:

`testMode=true docker-compose up --build -d`

#

End-to-end: 

`docker exec api docker-entrypoint.sh npm test`

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

Validations: 

`docker exec api docker-entrypoint.sh npm run test-validations`



#
# API ERRORS


## Binance (1 - 999)

1: ``



#
## Candlestick (1.000 - 1.999)

1000: ``

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