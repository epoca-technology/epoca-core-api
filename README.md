# Plutus API

## Requirements
- NodeJS: v16.13.1
- NPM: v8.1.2
- PostgreSQL: v12.9

#
## Getting Started

1) Install dependencies with `npm start` 
2) Build the project with `npm run build` 
3) Initialize the DB with `npm run cli-db` 
4) Alternatively, you can restore the database with `npm run cli-db`. Make sure to place the db backup file inside of `./db_backups` before running the CLI
5) Syncronize the candlesticks with `npm run cli-candlestick-sync`

#
## Last Database Dump

https://firebasestorage.googleapis.com/v0/b/projectplutus-dev.appspot.com/o/db_backups%2Fbackup.dump?alt=media&token=3787499e-e2f1-4e7e-954e-c496b492134a


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

Trading Simulation:  `npm run cli-trading-simulation`

##### *Important: In order to stop the trading simulation use `control + \` (SIGQUIT).


#
## Tests

End-to-end: `npm run test`

Forecast: `npm run test-forecast`

Candlestick: `npm run test-candlestick`

Utilities: `npm run test-utils`

Database: `npm run test-db`






#
# POSTGRES

Installation Guide: https://www.digitalocean.com/community/tutorials/how-to-install-postgresql-on-ubuntu-20-04-quickstart

##
## Commands

PSQL TOOL: `sudo -u postgres psql`

List Databases: `\l`

Select Database: `\c plutus;`

Start Service: `sudo service postgresql start`

Stop Service: `sudo service postgresql stop`


##
## Database User

Setup the password on the postgres user: `ALTER USER postgres WITH PASSWORD '123456';`






#
# PGADMIN4

Install the public key for the repository (if not done previously):

`sudo curl https://www.pgadmin.org/static/packages_pgadmin_org.pub | sudo apt-key add`

#

Create the repository configuration file:

`sudo sh -c 'echo "deb https://ftp.postgresql.org/pub/pgadmin/pgadmin4/apt/$(lsb_release -cs) pgadmin4 main" > /etc/apt/sources.list.d/pgadmin4.list && apt update'`

#


Install for both desktop and web modes: `sudo apt install pgadmin4`

Install for desktop mode only: `sudo apt install pgadmin4-desktop`


Install for web mode only: `sudo apt install pgadmin4-web `


Configure the webserver, if you installed pgadmin4-web: `sudo /usr/pgadmin4/bin/setup-web.sh`