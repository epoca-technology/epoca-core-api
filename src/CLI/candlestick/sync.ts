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

    // Sync the forecast candlesticks first
    await syncCandlesticks(true);

    // Allow a small delay
    await _utils.asyncDelay(20);
    console.log(' ');console.log(' ');

    // Sync the standard candlesticks
    await syncCandlesticks();
});







/**
 * Syncs the candlesticks based on the provided type.
 * @param forecast 
 * @returns Promise<void>
 */
async function syncCandlesticks(forecast?: boolean): Promise<void> {
    // Init the progress bar
    const progressBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    let progressBarCounter: number = 0;

    // Init the start timestamp
    let startTime: number = await _candlestick.getLastOpenTimestamp(forecast);

    // Calculate the estimated remaining hours for the sync to be complete
    const remainingHours: BigNumber = <BigNumber>_utils.outputNumber(new BigNumber(Date.now()).minus(startTime).dividedBy(1000).dividedBy(60).dividedBy(60), {
        dp: 0,
        ru: true,
        of: 'bn'
    });

    // Since 1k candlesticks are downloaded per request, calculate the estimated amount of requests needed
    const remainingRequests: number = <number>_utils.outputNumber(remainingHours.dividedBy(forecast ? 12000: 16.66), {dp: 0, ru: true})

    // Start the progress bar
    console.log(' ');
    console.log(`Syncing ${forecast ? 'Forecast': 'Standard'} Candlesticks...`);
    console.log(' ');
    progressBar.start(remainingRequests, progressBarCounter);


    // Retrieve candlesticks until they have been fully synced
    let fullySynced: boolean = false;
    while(!fullySynced) {
        try {
            // Save and retrieve the candlesticks from the starting timestamp
            const candlesticks: ICandlestick[] = await _candlestick.syncCandlesticks(forecast);

            // Check if the sync completed
            fullySynced = candlesticks.length < 1000;

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
    console.log(`The ${forecast ? 'Forecast': 'Standard'} Candlesticks have been synced.`);
    console.log('');
}



