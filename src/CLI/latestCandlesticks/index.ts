// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';
import * as fs from 'fs';

// Init Utilities
import { IUtilitiesService } from "../../modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Init Binance
import { IBinanceService, ICandlestickSeriesInterval, ICandlestickSeries, IBinanceCandlestick } from "../../modules/shared/binance";
const _binance: IBinanceService = appContainer.get<IBinanceService>(SYMBOLS.BinanceService);


// Initialize
console.log('LATEST CANDLESTICKS');
console.log('@param interval? // Defaults to 1m')
console.log('@param itemsQuantity? // Defaults to 1000');
console.log(' ');
console.log('The json file will be placed inside of test_candlesticks within the root directory');
console.log(' ');
prompt.start();


// Defaults
const d: {
    interval: ICandlestickSeriesInterval,
    itemsQuantity: number
} = {
    interval: '1m',
    itemsQuantity: 1000,
}


prompt.get(['interval', 'itemsQuantity'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // API Items Limit
    const apiLimit: number = 1000;

    // Init interval
    const interval: ICandlestickSeriesInterval = 
        typeof data.interval == "string" && data.interval.length ? <ICandlestickSeriesInterval>data.interval: d.interval;

    // Init Items Quantity
    const itemsQuantity: number = typeof data.itemsQuantity == "string" && data.itemsQuantity.length ? Number(data.itemsQuantity): d.itemsQuantity;

    // Init the series
    let series: ICandlestickSeries = await _binance.getCandlestickSeries('BTC',interval, undefined, undefined, itemsQuantity > apiLimit ? apiLimit: itemsQuantity);
    console.log(`Downloaded from ${_utils.toDateString(series[0][0])} to ${_utils.toDateString(series[series.length - 1][0])}`);

    // Check if it needs to look for more candlesticks in the past
    while (series.length < itemsQuantity) {
        // Allow a small delay to prevent Binance from blocking the IP
        await _utils.asyncDelay(30);

        /**
         * Check the limit that should be set.
         * In order to validate that the candlesticks items are properly connected, add 1 to the nextLimit
         */
        let nextLimit: number;
        if (itemsQuantity - series.length > apiLimit || itemsQuantity - series.length == 999) {
            nextLimit = apiLimit;
        } else {
            nextLimit = (itemsQuantity - series.length) + 1;
        }

        // Retrieve the previous series based on the first candle's open time
        let previousSeries: ICandlestickSeries = await _binance.getCandlestickSeries('BTC',interval, undefined, series[0][0], nextLimit);
        console.log(`Downloaded from ${_utils.toDateString(previousSeries[0][0])} to ${_utils.toDateString(previousSeries[previousSeries.length - 1][0])}`);

        // Make sure the last item from the previous array is equals to the first from the accumulated series
        if (previousSeries[previousSeries.length - 1][0] != series[0][0]) {
            console.log(previousSeries[previousSeries.length - 1][0]);
            console.log(series[0][0]);
            throw new Error('The open time of the last item in the previous series is different to the open time of the first item in the accumulated series.');
        }

        // Remove the last item from the previous series before concat
        previousSeries.pop();

        // Concat the two series
        series = previousSeries.concat(series);
    }
    
    // Minify the series
    //const minifiedSeries: ICandlestickSeries = minifySeries(series);
    const minifiedSeries: ICandlestickSeries = series;

    // Create the file
    fs.writeFile(`./test_candlesticks/${itemsQuantity}.json`, JSON.stringify(minifiedSeries), 'utf8', (err) => {
        if (err) throw err;
        console.log(' ');console.log(' ');
        console.log('RESULT:');
        console.log(`${itemsQuantity}.json was created out of ${series.length} items and has been placed in ./test_candlesticks`);
        console.log(`Period: ${_utils.toDateString(minifiedSeries[0][0])} - ${_utils.toDateString(minifiedSeries[minifiedSeries.length - 1][6])}`);
        console.log(' ');console.log(' ');
    });
});







/**
 * Given a candlestick series, it will minify its contents and return a compressed list.
 * @param series 
 * @returns ICandlestickSeries
 */
function minifySeries(series: ICandlestickSeries): ICandlestickSeries {
    let minSeries: ICandlestickSeries = [];
    for (let item of series) {
        minSeries.push(<IBinanceCandlestick>item.slice(0, 7));
    }
    return minSeries;
}