// Dependencies 
import "reflect-metadata";
import { appContainer } from "../../../ioc";
import { SYMBOLS } from "../../../symbols";
import * as prompt from 'prompt';

// Init class
import { IArimaService, IArimaForecast } from "../../../modules/shared/arima";
const _arima = appContainer.get<IArimaService>(SYMBOLS.ArimaService);

// Interfaces
import { IArimaMode, ITimeMode } from "./interfaces";

// Test Data
import {ICoinGeckoPrices, ICoinGeckoPrice} from './interfaces';
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
console.log('@param timeMode? // Defaults to d3: h1|h2|h3 = Hourly | d1|d2|d3|d4 = Daily | m1|m2|m3 = Monthly');
console.log('@param windowSize? // Defaults to 20');
console.log(' ');
prompt.start();


// Defaults
const d: {
    timeMode: ITimeMode,
    arimaMode: IArimaMode,
    windowSize: number,
    arimaDust: number
} = {
    timeMode: 'd3',
    arimaMode: '0',
    windowSize: 20,
    arimaDust: 0.01
}


prompt.get(['timeMode', 'windowSize'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Arima Mode
    //const arimaMode: IArimaMode = typeof data.arimaMode == "string" && data.arimaMode.length ? <IArimaMode>data.arimaMode: d.arimaMode;

    // Arima dust percentage, won't work with values lower than this one
    //const arimaDust: number = typeof data.arimaDust == "string" && data.arimaDust.length ? Number(data.arimaDust): d.arimaDust;

    // Initial Lot - No trading during these days
    //const initialCount: number = typeof data.initialCount == "string" && data.initialCount.length ? Number(data.initialCount): d.initialCount;
    const windowSize: number = typeof data.windowSize == "string" && data.windowSize.length ? Number(data.windowSize): d.windowSize;

    // Init the mode
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
    for (let p of initialList) { console.log(`${new Date(p[0]).toDateString()} | ${p[1]}`); }
    console.log(' ');
    console.log(' ');


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
        //const timestampList: number[] = getValuesList(0, processingList)
        //const priceList: number[] = getValuesList(1, processingList);

        //const arima: number = _arima.sarimax(priceList, timestampList);
        //const arima: number = _arima.arima(priceList);
        //const sarima: number = _arima.sarima(priceList);
        //const arima: number = _arima.sarima(getPriceValuesList(processingList));
        //const arimaAlt: number = _arima.arimaAlt(processingList);
        const forecast: IArimaForecast = _arima.forecastTendency(getValuesList(1, processingList));


        // Add the item to the processing list
        processingList.push(item);

        // Remove the first item to move the window up
        processingList.shift();


        // Make sure it isn't the last item in the list
        //if ((arima > 0 && sarima > 0) || (arima < 0 && sarima < 0)) {
        //if (i < rawPriceList.length - 1 && ((arima > 0 && sarima > 0 && arimaAlt > 0) || arima < 0 && sarima < 0 && arimaAlt < 0)) {
        //if (i < rawPriceList.length - 1 && (arima <= -(arimaDust) || arima >= arimaDust)) {
        //if (arima != 0) {
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