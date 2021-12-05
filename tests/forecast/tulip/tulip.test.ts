// Dependencies
import "reflect-metadata";
import {appContainer} from '../../../src/ioc';
import {BigNumber} from 'bignumber.js';
import { ICandlestickSeries, SYMBOLS } from "../../../src/types";

import {Tulip, ITulip, ISpanName, IMacdResult, IBollingerBandsResult} from "../../../src/lib/Forecast/Tulip"

// Init service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Series Data
import {getCandlestickSeries} from '../../data';


// Init test data
const td: ICandlestickSeries = getCandlestickSeries('720');




xdescribe('Tulip Indicators Essentials:',  function() {






    it('-Can calculate the Simple Moving Average (SMA)', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const correct: number[] = [82.43,82.74,83.09,83.32,83.63,83.78,84.25,84.99,85.57,86.22,86.80];

        // Retrieve sma
        const t: ITulip = new Tulip(td, {verbose: 2});
        const sma: number[] = await t.sma(series, 5);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], sma[i], 0.02)) { fail(`${correct[i]} is not close to ${sma[i]}`); }
        }
    });





    it('-Can calculate the Exponential Moving Average (EMA)', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const correct: number[] = [81.59,81.41,81.90,82.27,82.71,82.86,82.85,83.23,83.67,83.90,84.44,85.14,85.73,86.41,86.70];

        // Retrieve ema
        const t: ITulip = new Tulip(td, {verbose: 2});
        const ema: number[] = await t.ema(series, 5);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], ema[i], 0.02)) { fail(`${correct[i]} is not close to ${ema[i]}`); }
        }
    });







    it('-Can calculate the Moving Average Convergence/Divergence', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const correctMacd: number[] = [0.62,0.35,0.11,0.42,0.58,0.42,0.68,0.93,0.89,0.98,0.62];
        const correctMacdSignal: number[] = [0.62,0.56,0.47,0.46,0.49,0.47,0.52,0.60,0.66,0.72,0.70];
        const correctMacdHistogram: number[] = [0.00,-0.21,-0.36,-0.05,0.09,-0.05,0.17,0.33,0.24,0.26,-0.08];

        // Retrieve ema
        const t: ITulip = new Tulip(td, {verbose: 2});
        const macd: IMacdResult = await t.macd(series, 2, 5, 9);

        // Compare it to the correct lists
        for (let i = 0; i < correctMacd.length; i++) {
            if (!t.isCloseEnough(correctMacd[i], macd.macd[i], 0.02)) { fail(`${correctMacd[i]} is not close to ${macd.macd[i]}`); }
            if (!t.isCloseEnough(correctMacdSignal[i], macd.macdSignal[i], 0.02)) { fail(`${correctMacdSignal[i]} is not close to ${macd.macdSignal[i]}`); }
            if (!t.isCloseEnough(correctMacdHistogram[i], macd.macdHistogram[i], 0.02)) { fail(`${correctMacdHistogram[i]} is not close to ${macd.macdHistogram[i]}`); }
        }
    });











    it('-Can calculate the Relative Strength Index (RSI)', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const correct: number[] = [72.03,64.93,75.94,79.80,74.71,83.03,87.48,88.76,91.48,78.50];

        // Retrieve ema
        const t: ITulip = new Tulip(td, {verbose: 2});
        const rsi: number[] = await t.rsi(series, 5);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], rsi[i], 0.02)) { fail(`${correct[i]} is not close to ${rsi[i]}`); }
        }
    });









    it('-Can calculate the Bollinger Bands', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const lower: number[] = [80.53,80.99,82.53,82.47,82.42,82.44,82.51,83.14,83.54,83.87,85.29];
        const middle: number[] = [82.43,82.74,83.09,83.32,83.63,83.78,84.25,84.99,85.57,86.22,86.80];
        const upper: number[] = [84.32,84.49,83.66,84.16,84.84,85.12,86.00,86.85,87.61,88.57,88.32];

        // Retrieve ema
        const t: ITulip = new Tulip(td, {verbose: 2});
        const bbands: IBollingerBandsResult = await t.bbands(series, 5, 2);

        // Compare it to the correct lists
        for (let i = 0; i < lower.length; i++) {
            if (!t.isCloseEnough(lower[i], bbands.lower[i], 0.02)) { fail(`${lower[i]} is not close to ${bbands.lower[i]}`); }
            if (!t.isCloseEnough(middle[i], bbands.middle[i], 0.02)) { fail(`${middle[i]} is not close to ${bbands.middle[i]}`); }
            if (!t.isCloseEnough(upper[i], bbands.upper[i], 0.02)) { fail(`${upper[i]} is not close to ${bbands.upper[i]}`); }
        }
    });











    it('-Can calculate the Positive Volume Index (PVI)', async function() {
        // Init test data
        const closeSeries: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const volumeSeries: number[] = [5653100.00,6447400.00,7690900.00,3831400.00,4455100.00,3798000.00,3936200.00,4732000.00,4841300.00,3915300.00,6830800.00,6694100.00,5293600.00,7985800.00,4807900.00,];
        const correct: number[] = [1000.00,993.50,1015.69,1015.69,1023.15,1023.15,1019.34,1033.49,1040.38,1040.38,1054.81,1054.81,1054.81,1065.49,1065.49];

        // Retrieve pvi
        const t: ITulip = new Tulip(td, {verbose: 2});
        const pvi: number[] = await t.pvi(closeSeries, volumeSeries);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], pvi[i], 0.02)) { fail(`${correct[i]} is not close to ${pvi[i]}`); }
        }
    });







    it('-Negative Volume Index (NVI)', async function() {
        // Init test data
        const closeSeries: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const volumeSeries: number[] = [5653100.00,6447400.00,7690900.00,3831400.00,4455100.00,3798000.00,3936200.00,4732000.00,4841300.00,3915300.00,6830800.00,6694100.00,5293600.00,7985800.00,4807900.00,];
        const correct: number[] = [1000.00,1000.00,1000.00,1001.57,1001.57,996.06,996.06,996.06,996.06,993.82,993.82,1005.56,1009.62,1009.62,1004.10,];

        // Retrieve nvi
        const t: ITulip = new Tulip(td, {verbose: 2});
        const nvi: number[] = await t.nvi(closeSeries, volumeSeries);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], nvi[i], 0.02)) { fail(`${correct[i]} is not close to ${nvi[i]}`); }
        }
    });


});











describe('MACD:', function() {


    it('-', async function() {
        // Init the window size
        const windowSize: number = 720;

        // Initialize the entire series
        const series: ICandlestickSeries = getCandlestickSeries('1440');

        // Initialize the processing series
        let processingSeries: ICandlestickSeries = series.slice(0, windowSize);

        // Init the tulip lib with any series
        const t: ITulip = new Tulip(processingSeries, {verbose: 2});

        // Print the initial data
        console.log('Initial Data:');
        for (let s of processingSeries) { console.log(`${_utils.toDateString(s[6])} | ${s[4]}`); }
        console.log(' ');

        // Perform the analysis
        console.log('Analysis:');
        console.log(' ');
        for (let i = windowSize; i < series.length; i++) {
            // Add the item to the processing series
            processingSeries.push(series[i]);

            // Remove the first item to move the window up
            processingSeries.shift();

            // Retrieve indicators
            /*const macd: IMacdResult = await t.macd(_utils.filterList(processingSeries, 4, 'toNumber'), 12, 26, 9);
            const rsi6: number[] = await t.rsi(_utils.filterList(processingSeries, 4, 'toNumber'), 6);
            const rsi12: number[] = await t.rsi(_utils.filterList(processingSeries, 4, 'toNumber'), 12);
            const rsi24: number[] = await t.rsi(_utils.filterList(processingSeries, 4, 'toNumber'), 24);*/
            const sma7: number[] = await t.sma(_utils.filterList(processingSeries, 4, 'toNumber'), 7);
            const sma20: number[] = await t.sma(_utils.filterList(processingSeries, 4, 'toNumber'), 20);
            const sma70: number[] = await t.sma(_utils.filterList(processingSeries, 4, 'toNumber'), 70);

            const ema7: number[] = await t.ema(_utils.filterList(processingSeries, 4, 'toNumber'), 7);
            const ema20: number[] = await t.ema(_utils.filterList(processingSeries, 4, 'toNumber'), 20);
            const ema70: number[] = await t.ema(_utils.filterList(processingSeries, 4, 'toNumber'), 70);


            // Output the results
            console.log(`${_utils.toDateString(series[i][6])} | ${series[i][4]}`);
            //console.log(`macd: ${getResult(macd.macd)} | signal: ${getResult(macd.macdSignal)} | hist: ${getResult(macd.macdHistogram)}`);
            //console.log(`rsi6: ${getResult(rsi6)} | rsi12: ${getResult(rsi12)} | rsi24: ${getResult(rsi24)}`);
            //console.log(`sma7: ${getResult(sma7)} | sma20: ${getResult(sma20)} | sma70: ${getResult(sma70)}`);
            console.log(`ema7: ${getResult(ema7)} | ema20: ${getResult(ema20)} | ema70: ${getResult(ema70)}`);
            console.log(' ');
        }
    });



});



function getResult(numberList: number[]): number {
    return numberList[numberList.length - 1];
}












xdescribe('Tulip Initialization:', function() {


    it('-Can initialize the series with 720 candles | 1 month (Recommended)', function() {
        // Init instance
        const t: ITulip = new Tulip(td, {verbose: 2});
        const spans: ISpanName[] = ["oneMonth", "twoWeeks", "oneWeek", "threeDays"];

        // Init the values they should match
        const correct = {
            oneMonth: { firstPrice: 61166.03000000, length: 720},
            twoWeeks: { firstPrice: 58151.13000000, length: 360},
            oneWeek: { firstPrice: 54902.02000000, length: 168},
            threeDays: { firstPrice: 58430.45000000, length: 72}
        }

        // Init the last price - they should all match
        const lastPrice: number = 48203.74000000;

        // Iterate over each span and make sure all numbers match
        for (let span of spans) {
            //@ts-ignore
            expect(_utils.roundNumber(t.series[span].open[0])).toBe(_utils.roundNumber(correct[span].firstPrice));
            //@ts-ignore
            expect(_utils.roundNumber(t.series[span].open[t.series[span].open.length - 1])).toBe(_utils.roundNumber(lastPrice));
            //@ts-ignore
            expect(t.series[span].open.length).toBe(correct[span].length);
        }
        
        // Verbose
        /*for (let series of td) {
            let spanStarted: ISpanName;
            if (_utils.roundNumber(series[1]) == _utils.roundNumber(correct.oneMonth.firstPrice)) {
                spanStarted = 'oneMonth';
            } else if (_utils.roundNumber(series[1]) == _utils.roundNumber(correct.twoWeeks.firstPrice)) {
                spanStarted = 'twoWeeks';
            } else if (_utils.roundNumber(series[1]) == _utils.roundNumber(correct.oneWeek.firstPrice)) {
                spanStarted = 'oneWeek';
            } else if (_utils.roundNumber(series[1]) == _utils.roundNumber(correct.threeDays.firstPrice)) {
                spanStarted = 'threeDays';
            }
            console.log(`${_utils.toDateString(series[0])}: ${series[1]} ${spanStarted ? spanStarted + ' started': ''}`);
        }*/
    });



});








