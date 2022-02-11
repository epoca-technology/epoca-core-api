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
