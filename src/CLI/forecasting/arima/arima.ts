// Dependencies 
import "reflect-metadata";
import { appContainer } from "../../../ioc";
import { SYMBOLS } from "../../../symbols";
import * as prompt from 'prompt';

// Init class
import { IArimaService } from "../../../modules/shared/arima";
const _arima = appContainer.get<IArimaService>(SYMBOLS.ArimaService);

// Interfaces
import { IArimaMode, ICoinGeckoPrice, ICoinGeckoPrices, ITimeMode } from "./interfaces";

// Test Data
import {
    DAILY_PRICES_01,
    DAILY_PRICES_02,
    DAILY_PRICES_03,
    DAILY_PRICES_04
} from './data';


// Init Big Number
import BigNumber from "bignumber.js";
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN, EXPONENTIAL_AT: 32 });


// Initialize
console.log('ARIMA PLAYGROUND');
console.log('@param timeMode? // Defaults to d1 | h1|h2|h3 = Hourly | d1|d2|d3|d4 = Daily | m1|m2|m3 = Monthly');
console.log('@param arimaMode? // Defaults to 0 | 0 = Arima, 1 = Sarima, 2 = AutoArima');
console.log('@param initialCount? // Defaults to 10');
console.log('@param arimaDust? // Defaults to 0.5');
console.log(' ');
prompt.start();


// Defaults
const d: {
    timeMode: ITimeMode,
    arimaMode: IArimaMode,
    initialCount: number,
    arimaDust: number
} = {
    timeMode: 'd1',
    arimaMode: '0',
    initialCount: 10,
    arimaDust: 0.5
}


prompt.get(['timeMode', 'arimaMode', 'initialCount', 'arimaDust'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Arima Mode
    const arimaMode: IArimaMode = 
        typeof data.arimaMode == "string" && data.arimaMode.length ? <IArimaMode>data.arimaMode: d.arimaMode;

    // Arima dust percentage, won't work with values lower than this one
    const arimaDust: number = 
        typeof data.arimaDust == "string" && data.arimaDust.length ? Number(data.arimaDust): d.arimaDust;

    // Initial Lot - No trading during these days
    const initialCount: number = 
        typeof data.initialCount == "string" && data.initialCount.length ? Number(data.initialCount): d.initialCount;

    // Init the mode
    const m: ITimeMode = typeof data.timeMode == "string" && data.timeMode.length ? <ITimeMode>data.timeMode: d.timeMode;

    // Init the prices
    const rawPriceList: ICoinGeckoPrices = getRawPrices(m);
    const initialList: ICoinGeckoPrices = rawPriceList.slice(0, initialCount);
    let processingList: ICoinGeckoPrices = initialList.slice();

    // Init counts
    let total: number = 0;
    let correct: number = 0;
    let incorrect: number = 0;

    // Initial Data
    console.log(' ');
    console.log(' ');
    console.log('Initial Data:');
    for (let p of initialList) { console.log(`${new Date(p[0]).toDateString()} | ${p[1]}`); }
    console.log(' ');
    console.log(' ');


    console.log('Analysis:');
    console.log(' ');
    for (let i = initialCount; i < rawPriceList.length; i++) {
        // Init values
        const item: ICoinGeckoPrice = rawPriceList[i];
        const date: string = getDateString(item[0]);
        let previousPrice: number = rawPriceList[i - 1][1];
        let currentPrice: number = item[1];
        let outcome: string = 'unknown'; // correct|incorrect|unknown


        // Retrieve Forecast
        const arima: number = getArimaForecast(arimaMode, processingList);


        // Add the item to the processing list
        processingList.push(item);


        // Make sure it isn't the last item in the list
        if (i < rawPriceList.length - 1 && (arima <= -(arimaDust) || arima >= arimaDust)) {

            /**
             * A long prediction means that they price of the next period should be higher than the current period
             */
            if (arima > 0) {
                if (currentPrice > previousPrice) {
                    correct += 1;
                    outcome = 'correct';
                } else {
                    incorrect += 1;
                    outcome = 'incorrect';
                }
            } 
            
            /**
             * A short prediction means that they price of the next period should be lower than the current period
             */
            else {
                if (currentPrice < previousPrice) {
                    correct += 1;
                    outcome = 'correct';
                } else {
                    incorrect += 1;
                    outcome = 'incorrect';
                }
            }

            // Increament the total counter
            total += 1;
        }

        // Log item
        console.log(`${i}) ${date} | ${arima} - ${outcome.toUpperCase()}`);
        console.log(`Previous Price: ${previousPrice}`);
        console.log(`Current Price: ${currentPrice}`);
        console.log(' ');console.log(' ');
    }
    console.log(' ');console.log(' ');


    console.log('Summary:');
    console.log(`Total: ${total}`);
    console.log(`Correct: ${correct}`);
    console.log(`Incorrect: ${incorrect}`);
    console.log(`Win Rate: ${getWinRate(total, correct)}%`);
})









/**
 * Retrieves the raw prices based on the time.
 * @param mode 
 * @returns ICoinGeckoPrices
 */
function getRawPrices(mode: ITimeMode): ICoinGeckoPrices {
    switch(mode) {
        case 'h1':
            return roundPrices(DAILY_PRICES_01);
        case 'h2':
            return roundPrices(DAILY_PRICES_01);
        case 'h3':
            return roundPrices(DAILY_PRICES_01);
        case 'd1':
            return roundPrices(DAILY_PRICES_01);
        case 'd2':
            return roundPrices(DAILY_PRICES_02);
        case 'd3':
            return roundPrices(DAILY_PRICES_03);        
        case 'd4':
            return roundPrices(DAILY_PRICES_04);
        case 'm1':
            return roundPrices(DAILY_PRICES_01);
        case 'm2':
            return roundPrices(DAILY_PRICES_01);
        case 'm3':
            return roundPrices(DAILY_PRICES_01);
        default:
            throw new Error(`The provided time mode is invalid: ${mode}.`);

    }
}




/**
 * Given a list of CoinGecko prices, it will round each one to a maximum of 2 decimals.
 * @param list 
 * @returns ICoinGeckoPrices
 */
function roundPrices(list: ICoinGeckoPrices): ICoinGeckoPrices {
    let roundedList: ICoinGeckoPrices = [];
    for (let item of list) {
        roundedList.push([
            item[0],
            new BigNumber(item[1]).decimalPlaces(2).toNumber()
        ]);
    }
    return roundedList;
}








/**
 * Based on the provided mode & list, it will forecast the nexy % change.
 * @param mode 
 * @param processingList 
 * @returns number
 */
function getArimaForecast(mode: IArimaMode, processingList: ICoinGeckoPrices): number {
    switch(mode) {
        case '0':
            return _arima.arima(getPriceValuesList(processingList));
        case '1':
            return _arima.sarima(getPriceValuesList(processingList));
        case '2':
            //return _arima.autoArima(getPriceValuesList(processingList));
    }
}







/**
 * Given a list of CoinGecko Prices, it will retrieve the list of prices only.
 * @param list 
 * @returns number[]
 */
function getPriceValuesList(list: ICoinGeckoPrices): number[] {
    let priceList: number[] = [];
    for (let item of list) { priceList.push(item[1]) }
    return priceList;
}











/* Misc Helpers */




/**
 * Retrieves the date in a readable format.
 * @param timestamp 
 * @returns string
 */
function getDateString(timestamp: number): string {
    return new Date(timestamp).toDateString()
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