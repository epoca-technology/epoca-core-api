# Plutus API

## Getting Started

Install dependencies with `npm start`

## Build

Run `npm run build` to perform a gulp build

## Server

Run `npm start` to run the server

## CLI

Database:  `npm run cli-db`

Latest Candlesticks:  `npm run cli-latest-candlesticks`


## Tests

End-to-end: `npm run test`

Forecast: `npm run test-forecast`

Trading Simulation: `npm run test-trading-simulation`

Utilities: `npm run test-utils`

Database: `npm run test-db`



## MySQL

Check Status: `systemctl status mysql.service`

Monitor: `mysql -u root -p`

Start: `sudo systemctl start mysql`

Stop: `sudo systemctl stop mysql`


### AUTH Error Fix

Open the monitor with `sudo mysql`. Enter the following command

`ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY '123456';`


Then run this query to refresh privileges:

`flush privileges;`