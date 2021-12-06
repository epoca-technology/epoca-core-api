// Dependencies
import "reflect-metadata";
import {appContainer} from '../../../src/ioc';
import { ICandlestickSeries, SYMBOLS } from "../../../src/types";

import {Tulip, ITulip, ISpanName} from "../../../src/lib/Forecast/Tulip"

// Init service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Series Data
import {getCandlestickSeries} from '../../data';


// Init test data
const td: ICandlestickSeries = getCandlestickSeries('720');




describe('Tulip Indicators Essentials:',  function() {

    it('-', async function() {
        const tda: ICandlestickSeries = getCandlestickSeries('10000');
        const t: ITulip = new Tulip(tda.slice(0,720), {verbose: 2});
        await t.forecast();
    });




    it('-Can calculate the Simple Moving Average (SMA)', async function() {
        // Init test data
        const series: number[] = [81.59,81.06,82.87,83.00,83.61,83.15,82.84,83.99,84.55,84.36,85.53,86.54,86.89,87.77,87.29];
        const correct: number[] = [82.43,82.74,83.09,83.32,83.63,83.78,84.25,84.99,85.57,86.22,86.80];

        // Retrieve sma
        const t: ITulip = new Tulip(td, {verbose: 2});
        // @ts-ignore
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
        // @ts-ignore
        const ema: number[] = await t.ema(series, 5);

        // Compare it to the correct list
        for (let i = 0; i < correct.length; i++) {
            if (!t.isCloseEnough(correct[i], ema[i], 0.02)) { fail(`${correct[i]} is not close to ${ema[i]}`); }
        }
    });



});







describe('Tulip Initialization:', function() {


    it('-Can initialize the series with 720 candles | 1 month (Recommended)', function() {
        // Init instance
        const t: ITulip = new Tulip(td, {verbose: 2});
        const spans: ISpanName[] = ["oneMonth", "twoWeeks", "oneWeek", "threeDays"];

        // Init the values they should match
        const correct = {
            oneMonth: { firstPrice: 60864.78000000, length: 720},
            twoWeeks: { firstPrice: 57971.77000000, length: 360},
            oneWeek: { firstPrice: 54900.66000000, length: 168},
            threeDays: { firstPrice: 57994.96000000, length: 72}
        }

        // Init the last price - they should all match
        const lastPrice: number = 48129.75000000;

        // Iterate over each span and make sure all numbers match
        for (let span of spans) {
            //@ts-ignore
            expect(_utils.roundNumber(t.series[span].close[0])).toBe(_utils.roundNumber(correct[span].firstPrice));
            //@ts-ignore
            expect(_utils.roundNumber(t.series[span].close[t.series[span].close.length - 1])).toBe(_utils.roundNumber(lastPrice));
            //@ts-ignore
            expect(t.series[span].close.length).toBe(correct[span].length);
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








