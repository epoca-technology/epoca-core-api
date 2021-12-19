// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';
import * as cliProgress from 'cli-progress';
import BigNumber from "bignumber.js";


// Init the Utilities Service
import { IUtilitiesService } from "../../modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the CryptoCurrency Service
import { ICryptoCurrencyService, ICryptoCurrencySymbol } from "../../modules/shared/cryptocurrency";
const _cCurrency: ICryptoCurrencyService = appContainer.get<ICryptoCurrencyService>(SYMBOLS.CryptoCurrencyService);


// Init the Candlestick Service
import { ICandlestick, ICandlestickService } from "../../modules/shared/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);





/**
 * CLI Initializer
 */
console.log('CANDLESTICK SYNC');
console.log('@param symbol');
console.log('@param startDate? // ONLY FOR TESTING: Format: 19-02-2020. If none is provided will default to the current last.');
console.log(' ');
prompt.start();




/**
 * Database CLI
 */
prompt.get(['symbol', 'startDate'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Init the progress bar
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let progressBarCounter: number = 0;

    // Init the symbol
    const symbol: ICryptoCurrencySymbol = <ICryptoCurrencySymbol>data.symbol;
    if (!_cCurrency.symbols.includes(symbol)) { throw new Error(`The symbol ${symbol} is not supported.`) }

    // Init the start timestamp
    let startTime: number;

    // If the start date was provided, retrieve the timestamp for it
    if (typeof data.startDate == "string" && data.startDate.length) {
        startTime = _utils.getTimestamp(data.startDate );
    }

    // Otherwise, retrieve the last saved open time
    else {
        startTime = await _candlestick.getLastOpenTimestamp(symbol);
    }

    // Calculate the estimated remaining hours for the sync to be complete
    const remainingHours: BigNumber = <BigNumber>_utils.outputNumber(new BigNumber(Date.now()).minus(startTime).dividedBy(1000).dividedBy(60).dividedBy(60), {
        decimalPlaces: 0,
        roundUp: true,
        outputFormat: 'BigNumber'
    });

    // Since 1k 1m candlesticks are downloaded per request, calculate the estimated amount of requests needed
    const remainingRequests: number = <number>_utils.outputNumber(remainingHours.dividedBy(16.66), {decimalPlaces: 0, roundUp: true, outputFormat: 'number'})

    // Start the progress bar
    console.log(' ');
    console.log('Syncing in progress...');
    console.log(' ');
    progressBar.start(remainingRequests, progressBarCounter);


    // Retrieve candlesticks until they have been fully synced
    let fullySynced: boolean = false;
    while(!fullySynced) {
        try {
            // Save and retrieve the candlesticks from the starting timestamp
            const candlesticks: ICandlestick[] = await _candlestick.saveCandlesticksFromStart(symbol, startTime);

            // Make sure candlesticks were retrieved
            if (candlesticks.length > 0) {
                // Set the next start time
                startTime = candlesticks[candlesticks.length -1].ot;

                // Check if finished syncing
                fullySynced = candlesticks.length < 1000;
            } 
            
            // If no candlesticks were retrieved it means the candlesticks are fully synced or Binance is experiencing an outage
            else {
                fullySynced = true;
            }

            // Update the progress and allow for a small delay before continuing
            progressBar.update(progressBarCounter += 1);
            if (!fullySynced) await _utils.asyncDelay(20);
        } catch (e) {
            console.log(' ');
            console.log(e);
            console.log(' ');
            await _utils.asyncDelay(40);
        }
    }


    // Sync completed
    progressBar.stop();
    console.log(' ');
    console.log(`The candlesticks for ${symbol} have been synced.`);
    console.log('');
});






