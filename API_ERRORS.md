[< Back](./README.md)


# CORE API ERRORS


## Binance (1 - 999)

1: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the candlesticks series.`

2: `Binance returned an invalid candlesticks series.`

3: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the order book.`

4: `Binance returned an invalid order book.`

5: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the open interest.`

6: `Binance returned an invalid open interest list.`

7: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the long short ratio.`

8: `Binance returned an invalid long short ratio list.`

9: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the balances.`

10: `Binance returned an invalid list of balances.`

11: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the active positions.`

12: `Binance returned an invalid list of active positions.`

13: `Binance returned an invalid HTTP response code (${response.statusCode}) when interacting with a position.`

14: `Binance returned an invalid HTTP response code (${response.statusCode}) when retrieving the account trades.`

15: `Binance returned an invalid list of account trades.`

16: ``


#
## Candlestick (1.000 - 1.999)

1000: `The Binance API should have returned at least 1 candlestick.`


### Candlestick Model

1200: `A valid list of candlesticks is required in order to invoke saveCandlesticks.`


### Candlestick Validations

1300: `The provided start (${start}) and|or end (${end}) timestamps are not valid numbers.`

1301: `The end (${end}) timestamp must be greater than the start (${start}) timestamp.`

1302: `The provided minutes interval (${intervalMinutes}) is invalid.`

1303: `The candlesticks query is larger than the permitted data limit. Limit: ${dataLimit}, Received: ${difference}`


### Candlestick File Service

1500: `Couldnt build a candlesticks csv file because the retrieved list is empty.`

1501: `The candlesticks file cannot be generated because there is a task running.`




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

8304: `The ID Token has expired. Please generate a new one and try again.`


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

12002: `The API cannot accept requests because it is running on restore mode.`









#
## API Error (13.000 - 13.999)

13000: ``








#
## Background Task (14.000 - 14.999)

14000: `The task ${this.task.name} cannot be started because it is already running.`

14001: `The task ${this.task.name} progress cannot be updated because there isnt a task running.`

14002: `The task ${this.task.name} progress cannot be updated because an invalid value was provided(${currentProgress}).`

14003: `The task ${this.task.name} cannot be marked as errored because there isnt a task running.`






#
## File Manager (15.000 - 15.999)

15000: `Google Cloud returned an invalid response when uploading ${originPath}.`

15001: `The upload process went through normally. However, the cloud file could not be listed in: ${destinationCloudPath}.`

15002: `Google Cloud returned an invalid response when downloading ${originCloudPath}.`

15003: `The downloaded file was not found in the local directory ${destinationPath}.`

15004: `The Google Cloud Download did not return valid files for ${cloudPath}.`

15005: `Google Cloud returned a valid response. However, no files could be extracted in: ${cloudPath}.`

15006: `The JSON File ${filePath} could not be read because it doesn't exist.`

15007: `The JSON File ${filePath} is empty.`

15008: `Error when parsing ${filePath}: ${this._utils.getErrorMessage(e)}`






#
## Epoch Service (16.000 - 16.999)

16000: `The epoch record ${epochID} was not be found in the database.`

16001: ``





#
## Epoch Validations (17.000 - 17.999)

17000: `The provided Epoch ID (${epochID}) is invalid.`

17001: `The provided Unpacked Epoch File is not a valid object.`

17002: `The provided Unpacked Epoch Configuration is not a valid object.`

17003: `The provided Unpacked Prediction Model Certificate is not a valid object.`

17004: `The Unpacked Regression Certificates is not a valid list.`

17005: `The Unpacked Model File Names is not a valid list.`

17006: `The provided Epoch ID (${epochID}) is diferent to the one in the Epoch File (${epochFile.epochConfig.id}).`

17007: `The model file for the regression ${reg.id} was not found.`

17008: `The regression certificate for ${reg.id} was not found.`

17009: `The Epoch ${epochID} cannot be installed because ${activeEpoch.id} is currently running.`

17010: `The Epoch ID ${epochID} has already been used.`

17011: `The Epoch cannot be uninstalled because none is running.`

17012: `The starting point cannot be in the future (${startAt}).`

17013: `The limit must be an integer ranging 1 and 30 (${limit}).`

17014: `The provided Model ID (${modelID}) is invalid.`

17015: `The Epoch cannot be uninstalled because there is an active position.`



#
## Epoch Model (18.000 - 18.999)

18000: ``

18001: `The prediction model certificate ${id} could not be found in the database.`

18002: `The regression certificate ${id} could not be found in the database.`

18003: ``

18004: ``




#
## Epoch File (19.000 - 19.999)

19000: ``

19001: ``






#
## Prediction Service (20.000 - 20.999)

20000: `A prediction cannot be generated if there isn't an active epoch.`

20001: ``

20002: ``

20003: ``






#
## Prediction Validations (21.000 - 21.999)

21000: `The Prediction API returned an invalid API Response when predicting.`

21001: `The provided Epoch ID (${epochID}) is invalid.`

21002: `The predictions range is invalid. Received: ${startAt} - ${endAt}.`

21003: `The predictions starting point must be less than the end. Received: ${startAt} - ${endAt}.`

21004: `The active prediction is undefined.`

21005: `The active prediction's duration has run out. Needs: ${min}, Has: ${pred.t}.`

21006: `The predictions query is larger than the permitted data limit. Limit: ${dataLimit}, Received: ${difference}`

21007: ``

21008: ``

21009: ``

21010: ``




#
## Prediction Model (22.000 - 22.999)

22000: `A valid list of candlesticks is required in order to invoke savePredictionCandlesticks.`

22001: ``

22002: ``







#
## Order Book Service (23.000 - 23.999)

23000: `The integrity of the order book cannot be validated because the candlesticks stream is out of sync.`

23001: `The difference between the current candlestick (spot) and the safe bid (futures) exceeds the established tolerance. Difference: ${bidDiff}%`

23002: `The difference between the current candlestick (spot) and the safe ask (futures) exceeds the established tolerance. Difference: ${askDiff}%`

23003: `The order book's safe bid cannot be greater than the safe ask. Bid: ${safeBid}, Ask: ${safeAsk}`




#
## Market State Service (24.000 - 24.999)

24000: ``

24001: ``



#
## Window State Service (25.000 - 25.999)

25000: ``

25001: ``



#
## Volume State Service (26.000 - 26.999)

26000: ``

26001: ``



#
## KeyZone State Service (27.000 - 27.999)

27000: ``

27001: ``



#
## Network Fee State Service (28.000 - 28.999)

28000: `Mempool.space returned an invalid HTTP response code (${response.statusCode}) when retrieving the fee records.`

28001: `Mempool.space returned an invalid fee record series.`





#
## Position Service (29.000 - 29.999)

29000: `The strategy state cannot be calculated as the provided position has no margin. Received ${margin}`

29001: `The USDT balance could not be retrieved from the Binance API. Received ${balances.length}`

29002: `The extracted USDT balance object is not complete. Available ${balances[0].availableBalance} | Balance: ${balances[0].balance}`

29003: `The ${side} position cannot be increased because it isnt active.`

29004: ``

29005: ``

29006: ``



#
## Position Validations (30.000 - 30.999)

30000: `The provided side (${side}) is invalid.`

30001: `Positions cannot be interacted with as there isnt an active Epoch.`

30002: `The strategy cannot be updated because there is an active long position.`

30003: `The strategy cannot be updated because there is an active short position.`

30004: `The provided strategy is not a valid object.`

30005: `The leverage must be a valid number ranging 1-5. Received: ${newStrategy.leverage}`

30006: `The level increase requirement must be a valid number ranging 0.01-10. Received: ${newStrategy.level_increase_requirement}`

30007: `The strategy could not be updated because level_1 is invalid.`

30008: `The strategy could not be updated because level_2 is invalid.`

30009: `The strategy could not be updated because level_3 is invalid.`

30010: `The strategy could not be updated because level_4 is invalid.`

30011: `The ${side} position cannot be closed because it isnt active.`

30012: `The ${side} position cannot be opened because it is already active.`

30013: `There isnt enough available balance to cover the ${side} position. Has: ${availableBalance}. Needs: ${firstLeveLSize}`

30014: `The ${side} position cannot be increased because it isnt active.`

30015: `The ${side} position cannot be increased because is no next level.`

30016: `There isnt enough available balance to cover the ${side} position increase. Has: ${availableBalance}. Needs: ${nextLevel.size}`

30017: `The ${side} position cannot be increased because the mark price doesnt meet the min increase requirement. Has: ${position.mark_price}. Needs: ${position.min_increase_price}`

30017: `The trade list date range is invalid. Received: ${startAt} - ${endAt}.`

30018: `The trade list starting point must be less than the end. Received: ${startAt} - ${endAt}.`

30019: `The trade list query is larger than the permitted data limit. Limit: ${this.tradeListLimit}, Received: ${difference}`

30020: ``

30021: ``

30022: ``




#
## Position Model (31.000 - 31.999)

31000: ``

31001: ``