// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';
import * as cliProgress from 'cli-progress';
import BigNumber from "bignumber.js";


// Init the Utilities Service
import { IUtilitiesService } from "../../modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Candlestick Service
import { ICandlestick, ICandlestickService } from "../../modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Delays
const normalDelay: number = 10;
const onErrorDelay: number = 20;



/**
 * CLI Initializer
 */
console.log('CANDLESTICKS SYNC');
console.log(' ');
prompt.start();




/**
 * Database CLI
 */
prompt.get([], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Init the progress bar
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let progressBarCounter: number = 0;

    // Init the start timestamp
    let startTime: number = await _candlestick.getLastOpenTimestamp();

    // Calculate the estimated remaining hours for the sync to be complete
    const remainingHours: BigNumber = <BigNumber>_utils.outputNumber(new BigNumber(Date.now()).minus(startTime).dividedBy(1000).dividedBy(60).dividedBy(60), {
        dp: 0,
        ru: true,
        of: 'bn'
    });

    // Since 1k candlesticks are downloaded per request, calculate the estimated amount of requests needed
    const remainingRequests: number = <number>_utils.outputNumber(remainingHours.dividedBy(16.66), {dp: 0, ru: true})

    // Start the progress bar
    console.log(' ');
    console.log(`Syncing Candlesticks...`);
    console.log(' ');
    progressBar.start(remainingRequests, progressBarCounter);


    // Retrieve candlesticks until they have been fully synced
    let fullySynced: boolean = false;
    while(!fullySynced) {
        try {
            // Save and retrieve the candlesticks from the starting timestamp
            const candlesticks: ICandlestick[] = await _candlestick.syncCandlesticks();

            // Check if the sync completed
            fullySynced = candlesticks.length < 1000;

            // Update the progress and allow for a small delay before continuing
            progressBar.update(progressBarCounter += 1);
            if (!fullySynced) await _utils.asyncDelay(normalDelay);
        } catch (e) {
            console.log(' ');
            console.log(e);
            console.log(' ');
            await _utils.asyncDelay(onErrorDelay);
        }
    }


    // Sync completed
    progressBar.stop();
    console.log(' ');
    console.log(`The Candlesticks have been synced.`);
    console.log('');
});