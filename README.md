# PLUTUS CORE API

## Requirements
- NodeJS: v16.13.1
- NPM: v8.1.2
- PostgreSQL: v14

#
## Getting Started

1) Install dependencies with `npm start` 
2) Build the project with `npm run build` 
3) Initialize the DB with `npm run cli-db` 
4) Alternatively, you can restore the database with `npm run cli-db`. Make sure to place the db backup file inside of `./db_backups` before running the CLI
5) Syncronize the candlesticks with `npm run cli-candlestick-sync`

#
## Last Database Dump

https://firebasestorage.googleapis.com/v0/b/projectplutus-dev.appspot.com/o/db_backups%2Fbackup.dump?alt=media&token=f2afbcc6-51f0-4bb3-aa73-80152efecfd6


#
## Build

Run `npm run build` to perform a gulp build

#
## Server

Run `npm start` to run the server

#
## CLI

Database:  `npm run cli-db`

Candlestick Sync:  `npm run cli-candlestick-sync`

Past Trading Simulation:  `npm run cli-trading-simulation-past`

Future Trading Simulation:  `npm run cli-trading-simulation-future`

##### *Important: In order to stop the trading simulation use `control + \` (SIGQUIT).


#
## Tests

End-to-end: `npm run test`

Candlestick: `npm run test-candlestick`

Utilities: `npm run test-utils`

Database: `npm run test-db`





# 
# API ERRORS

Go to [API Errors](/docs/API_ERRORS.md)


#
# POSTGRES

Go to [POSTGRES](/docs/POSTGRES.md)



#
# PGADMIN4

Go to [PGADMIN](/docs/PGADMIN.md)