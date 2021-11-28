// Dependencies 
import "reflect-metadata";
import { appContainer } from "../../../ioc";
import { SYMBOLS } from "../../../symbols";
import * as prompt from 'prompt';

// Init class
//import { ITrendService } from "../../../modules/shared/trend";
//const _trend: ITrendService = appContainer.get<ITrendService>(SYMBOLS.TrendService);
import { ITrendForecast, TrendForecast } from "../../../lib/TrendForecast";

// Interfaces

// Test Data
import {
    ITimeMode,
    ICoinGeckoPrices, 
    ICoinGeckoPrice,
    HOURLY_PRICES_01,
    HOURLY_PRICES_02,
    HOURLY_PRICES_03,
    DAILY_PRICES_01,
    DAILY_PRICES_02,
    DAILY_PRICES_03,
    DAILY_PRICES_04,

} from '../data';


// Init Big Number
import BigNumber from "bignumber.js";


// Initialize
console.log('TREND PLAYGROUND');
console.log('@param timeMode? // Defaults to h3: h1|h2|h3 = Hourly | d1|d2|d3|d4 = Daily | m1|m2|m3 = Monthly');
console.log('@param windowSize? // Defaults to 80');
console.log(' ');
prompt.start();


// Defaults
const d: {
    timeMode: ITimeMode,
    windowSize: number
} = {
    timeMode: 'h3',
    windowSize: 100,
}


prompt.get(['timeMode', 'windowSize'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Init window size
    const windowSize: number = typeof data.windowSize == "string" && data.windowSize.length ? Number(data.windowSize): d.windowSize;

    // Init time mode
    const m: ITimeMode = typeof data.timeMode == "string" && data.timeMode.length ? <ITimeMode>data.timeMode: d.timeMode;

    // Init the prices
    const rawPriceList: ICoinGeckoPrices = getRawPrices(m);
    const initialList: ICoinGeckoPrices = rawPriceList.slice(0, windowSize);
    let processingList: ICoinGeckoPrices = initialList.slice();


    // Init counts
    let total: number = 0;
    let correct: number = 0;
    let incorrect: number = 0;
    let neutral: number = 0;

    // Initial Data
    console.log(' ');
    console.log(' ');
    console.log('Initial Data:');
    for (let p of initialList) { console.log(`${getDateString(p[0])} | ${p[1]}`); }
    console.log(' ');
    console.log(' ');


    /*const tf: ITrendForecast = new TrendForecast();
    const forecast: any = tf.forecast(getValuesList(1, processingList));
    console.log(forecast);
    return;*/

    console.log('Analysis:');
    console.log(' ');
    for (let i = windowSize; i < rawPriceList.length; i++) {
        // Init values
        const item: ICoinGeckoPrice = rawPriceList[i];
        const date: string = getDateString(item[0]);
        let previousPrice: number = rawPriceList[i - 1][1];
        let currentPrice: number = item[1];
        let outcome: string = 'neutral'; // win|lose|neutral


        // Retrieve Forecast
        const tf: ITrendForecast = new TrendForecast();
        const forecast: any = tf.forecast(getValuesList(1, processingList));
        console.log(forecast);

        // Add the item to the processing list
        processingList.push(item);

        // Remove the first item to move the window up
        processingList.shift();


        // Make sure it isn't the last item in the list
        if (forecast.result != 0) {

            /**
             * A long prediction means that they price of the next period should be higher than the current period
             */
            if (forecast.result > 0) {
                if (currentPrice > previousPrice) {
                    correct += 1;
                    outcome = 'win';
                } else {
                    incorrect += 1;
                    outcome = 'lose';
                }
            } 
            
            /**
             * A short prediction means that they price of the next period should be lower than the current period
             */
            else {
                if (currentPrice < previousPrice) {
                    correct += 1;
                    outcome = 'win';
                } else {
                    incorrect += 1;
                    outcome = 'lose';
                }
            }

            // Increament the total counter
            total += 1;
        } else { neutral +=1 }

        // Log item
        console.log(`${i}) ${date} | a: ${forecast.result} | ${outcome.toUpperCase()}`);
        console.log(`Reality: ${previousPrice} -> ${currentPrice}`);
        console.log(' ');console.log(' ');
    }
    console.log(' ');console.log(' ');


    console.log('Summary:');
    console.log(`Total: ${total}`);
    console.log(`Correct: ${correct}`);
    console.log(`Incorrect: ${incorrect}`);
    console.log(`Neutral: ${neutral}`);
    console.log(`Win Rate: ${getWinRate(total, correct)}%`);
})









/**
 * Retrieves the raw prices based on the time.
 * @param mode 
 * @returns ICoinGeckoPrices
 */
function getRawPrices(mode: ITimeMode): ICoinGeckoPrices {
    // Init price list
    let list: ICoinGeckoPrices;

    // Populate the list based on the mode
    switch(mode) {
        case 'h1':
            list = HOURLY_PRICES_01.slice();
            break;
        case 'h2':
            list = HOURLY_PRICES_02.slice();
            break;
        case 'h3':
            list = HOURLY_PRICES_03.slice();
            break;
        case 'd1':
            list = DAILY_PRICES_01.slice();
            break;
        case 'd2':
            list = DAILY_PRICES_02.slice();
            break;
        case 'd3':
            list = DAILY_PRICES_03.slice();
            break;    
        case 'd4':
            list = DAILY_PRICES_04.slice();
            break;
        default:
            throw new Error(`The provided time mode is invalid: ${mode}.`);
    }

    // Round the prices for all items
    for (let i = 0; i < list.length; i++) {
        list[i][1] = new BigNumber(list[i][1]).decimalPlaces(2).toNumber()
    }

    // Return the list
    return list;
}




/**
 * Given a list of CoinGecko prices, it will round each one to a maximum of 2 decimals.
 * @param list 
 * @returns ICoinGeckoPrices
 */
/*function roundPrices(list: ICoinGeckoPrices): ICoinGeckoPrices {
    let roundedList: ICoinGeckoPrices = [];
    for (let item of list) {
        roundedList.push([
            item[0],
            new BigNumber(item[1]).decimalPlaces(2).toNumber()
        ]);
    }
    return roundedList;
}*/








/**
 * Based on the provided mode & list, it will forecast the nexy % change.
 * @param mode 
 * @param processingList 
 * @returns number
 */
/*function getArimaForecast(mode: IArimaMode, processingList: ICoinGeckoPrices): number {
    switch(mode) {
        case '0':
            return _arima.arima(getPriceValuesList(processingList));
        case '1':
            return _arima.sarima(getPriceValuesList(processingList));
        case '2':
            //return _arima.autoArima(getPriceValuesList(processingList));
    }
}*/







/**
 * Given a list of CoinGecko Prices, it will retrieve the list of prices only.
 * @param index 0 = timestamp, 1 = price
 * @param list 
 * @returns number[]
 */
function getValuesList(index: number, list: ICoinGeckoPrices): number[] {
    let priceList: number[] = [];
    for (let item of list) { priceList.push(item[index]) }
    return priceList;
}











/* Misc Helpers */




/**
 * Retrieves the date in a readable format.
 * @param timestamp 
 * @returns string
 */
function getDateString(timestamp: number): string {
    const date: Date = new Date(timestamp);
    return `${date.toDateString()} H: ${date.getHours()}`
}








/**
 * Based the number of correct forecasts it will return the %
 * @param total 
 * @param correct 
 * @returns string
 */
function getWinRate(total: number, correct: number): number {
    return new BigNumber(correct).times(100).dividedBy(total).decimalPlaces(2).toNumber();
}