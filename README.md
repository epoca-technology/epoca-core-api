# PLUTUS CORE API

Plutus Core is an API designed to manage the Plutus system as well as communicating with the GUI and the Forecast API.


## Requirements

- Docker: v20.10.12

- Docker Compose: v1.29.2



### Local Testing

- NodeJS: v16.13.1

- NPM: v8.1.2

- PostgreSQL: v14

- Python: v3.7








#
## Tests

#

End-to-end: 

`docker exec api docker-entrypoint.sh npm run test`

API Error: 

`docker exec api docker-entrypoint.sh npm run test-api-error`

Auth: 

`docker exec api docker-entrypoint.sh npm run test-auth`

Candlestick: 

`docker exec api docker-entrypoint.sh npm run test-candlestick`

Database: 

`docker exec api docker-entrypoint.sh npm run test-db`

GUI Version: 

`docker exec api docker-entrypoint.sh npm run test-gui-version`

IP Blacklist: 

`docker exec api docker-entrypoint.sh npm run test-ip-blacklist`

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

1: `Binance returned an invalid candlesticks series.`



#
## Candlestick (1.000 - 1.999)

1000: `The Binance API should have returned at least 1 candlestick.`

### Candlestick Model

1200: `A valid list of candlesticks is required in order to invoke saveCandlesticks.`

### Candlestick Validations

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

### Server Validations

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

8000: `Couldnt initialize the Auth Module because there are no users stored in the db.`

8001: `The uid ${uid} was not found in the local authorities object.`

8002: `The user ${uid} is not authorized to perform the action. Has ${this.authorities[uid]} and needs ${requiredAuthority}`


### Auth Model

8300: ``

8301: `Could not retrieve the otp secret because the uid (${uid}) was not found.`

8302: `The provided OTP token (${otpToken}) is invalid or no longer active for uid: ${uid}.`

8303: `The uid couldnt be extracted when verifying the ID Token.`

8304: `The uid couldnt be extracted when verifying the ID Token.`


### Auth Validations

8500: `The provided email (${email}) has an invalid format.`

8501: `The provided authority (${authority}) is invalid.`

8502: `The provided email (${email}) is being used by another user.`

8503: `The email cannot be updated because the user (${uid}) couldnt be found.`

8504: `The provided uid (${uid}) is invalid.`

8505: `The provided password is invalid.`

8506: `The provided uid (${uid}) didnt match any users in the database.`

8507: `The new authority cannot be the same as the on in the DB for user (${uid}).`

8508: `The provided FCM Token (${newFCMToken}) is invalid.`

8509: `The god user is inmutable, the value (${newEmail}) cannot be set.`

8510: `The provided OTP Token (${otpToken}) has an invalid format.`

8511: `The provided reCAPTCHA is invalid.`

8512: `The provided credentials are invalid.`

8513: `The provided ID Token has an invalid format.`




#
## API Secret (9.000 - 9.999)

9000: `A list of valid uids must be provided in order to refresh the api secrets.`

9001: `A valid secrets object must be provided in order to update the local secrets.`

9002: `The uid (${uid}) was not found in the local secrets object.`

9003: `The uid (${uid}) provided an api secret with an invalid format: ${secret}.`

9004: `The uid (${uid}) provided an api secret that didnt match the one stored locally: ${secret}.`





#
## Validations (10.000 - 10.999)

10000: `The reCAPTCHA could not be validated because Googles API returned an invalid verification response.`







#
## IP Blacklist (11.000 - 11.999)

11000: `The IP ${ip} is currently blacklisted and therefore cannot interact with the API`


### IP Blacklist Validations

11300: `The provided IP has an invalid format: ${ip}`

11301: `If the notes are provided, they must be valid: ${notes}`

11302: `The IP you are trying to blacklist is already registered: ${ip}`

11303: `The IP you are trying to update the notes for, does not exist: ${ip}`







#
## Request Guard (12.000 - 12.999)

12000: `The API cannot accept requests because it is running on test mode.`

12001: `The API cannot accept requests because it has not yet been initialized.`

12002: `The param (${paramKey}) is required but was not provided.`









#
## API Error (13.000 - 13.999)

13000: ``