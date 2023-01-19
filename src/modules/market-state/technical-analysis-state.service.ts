import {injectable, inject, postConstruct} from "inversify";
import * as tulind from "tulind";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickModel, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IStateType,
    ITADataset,
    ITADatasets,
    ITAIndicatorAction,
    ITAIndicatorActionCounter,
    ITAIndicatorPayload,
    ITAIntervalState,
    ITAIntervalStateResult,
    ITAIntervalStateResultBuild,
    ITAMovingAveragesBuild,
    ITAOscillatorsBuild,
    ITAState,
    ITechnicalAnalysisStateService
} from "./interfaces";




@injectable()
export class TechnicalAnalysisStateService implements ITechnicalAnalysisStateService {
    // Inject dependencies
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.CandlestickModel)                   private _candlestickModel: ICandlestickModel;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Window Size
     * The number of candlesticks that must be included in each dataset.
     */
    private readonly windowSize: number = 210;


    /**
     * Technical Analysis Interval
     * Every intervalSeconds, the technical analysis state state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 20; // ~20 seconds


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: ITAState;



    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultState();
    }





    /***************
     * Initializer *
     ***************/





    /**
     * Calculates the state and initializes the interval that will
     * update the state every ~3 minutes.
     * @returns  Promise<void>
     */
    public async initialize(): Promise<void> {
        // Calculate the state and initialize the interval
        await this.updateState();
        this.stateInterval = setInterval(async () => {
            await this.updateState() 
        }, this.intervalSeconds * 1000);
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.stateInterval) clearInterval(this.stateInterval);
        this.stateInterval = undefined;
    }






    

    


    /**************
     * Retrievers *
     **************/




    /**
     * Builds the datasets for all required intervals and
     * calculates the current state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        try {
            // Build the datasets
            const ds: ITADatasets = this.makeDatasets();

            // Build and update the state for all intervals
            this.state = {
                "30m": await this.buildIntervalState(ds["30m"]),
                "1h": await this.buildIntervalState(ds["1h"]),
                "2h": await this.buildIntervalState(ds["2h"]),
                "4h": await this.buildIntervalState(ds["4h"]),
                "1d": await this.buildIntervalState(ds["1d"]),
                ts: Date.now()
            }
        } catch (e) {
            console.log(e);
            this._apiError.log("TechnicalAnalysisState.updateState", e);
            this.state = this.getDefaultState();
        }
    }





    /**
     * Builds the state for an interval based on the given dataset.
     * @param ds 
     * @returns Promise<ITAIntervalState>
     */
    private async buildIntervalState(ds: ITADataset): Promise<ITAIntervalState> {
        // Build the moving averages
        let ma: ITAMovingAveragesBuild = await this.buildMovingAverages(ds);

        // Build the oscillators
        let osc: ITAOscillatorsBuild = await this.buildOscillators(ds, ma.counter);


        // Build the results
        const results: ITAIntervalStateResultBuild = this.buildIntervalStateResult(osc.counter, ma.counter);

        // Remove the counter from the indicator builds prior to the merge
        delete osc.counter;
        delete ma.counter;

        // Finally, return the build
        return {
            s: results.summary,
            o: results.oscillators,
            m: results.moving_averages,
            p: Object.assign({}, osc, ma)
        }
    }





    /**
     * Based on the interval's counters, it will build the results for each,
     * the summary, oscillators and moving averages.
     * @param oscCounter 
     * @param maCounter 
     * @returns ITAIntervalStateResultBuild
     */
    private buildIntervalStateResult(
        oscCounter: ITAIndicatorActionCounter, 
        maCounter: ITAIndicatorActionCounter
    ): ITAIntervalStateResultBuild {
        return {
            summary: this.getIntervalStateResult({
                BUY: oscCounter.BUY + maCounter.BUY,
                SELL: oscCounter.SELL + maCounter.SELL,
                NEUTRAL: oscCounter.NEUTRAL + maCounter.NEUTRAL,
            }),
            oscillators: this.getIntervalStateResult(oscCounter),
            moving_averages: this.getIntervalStateResult(maCounter),
        };
    }





    /**
     * Builds the interval state result based on a given counter
     * @param counter 
     * @returns ITAIntervalStateResult
     */
    private getIntervalStateResult(counter: ITAIndicatorActionCounter): ITAIntervalStateResult {
        // Init the action
        let action: IStateType = 0;

        // Calculate the mean
        const totalIndicators: number = counter.BUY + counter.SELL + counter.NEUTRAL;
        const sum: number = counter.BUY + (counter.SELL * -1);
        const mean: number = sum / totalIndicators;

        // Set the action accordingly
        if      (mean >= -1 && mean < -0.5) { action = -2 }
        else if (mean >= -0.5 && mean < -0.1) { action = -1 }
        else if (mean >= -0.1 && mean <= 0.1) { action = 0 }
        else if (mean > 0.1 && mean <= 0.5) { action = 1 }
        else if (mean > 0.5 && mean <= 1) { action = 2 }

        // Finally, return the result
        return {
            a: action,
            b: counter.BUY,
            s: counter.SELL,
            n: counter.NEUTRAL,
        };
    }





    /**
     * Builds the moving averages data based on a given dataset.
     * @param ds 
     * @returns Promise<ITAMovingAveragesBuild>
     */
    private async buildMovingAverages(ds: ITADataset): Promise<ITAMovingAveragesBuild> {
        // Initialize the counter
        let counter: ITAIndicatorActionCounter = { BUY: 0, SELL: 0, NEUTRAL: 0 };

        // Calculate the EMAs
        const ema_10: ITAIndicatorPayload = await this.ema(ds.close, 10);
        counter[ema_10.a] += 1;
        const ema_20: ITAIndicatorPayload = await this.ema(ds.close, 20);
        counter[ema_20.a] += 1;
        const ema_30: ITAIndicatorPayload = await this.ema(ds.close, 30);
        counter[ema_30.a] += 1;
        const ema_50: ITAIndicatorPayload = await this.ema(ds.close, 50);
        counter[ema_50.a] += 1;
        const ema_100: ITAIndicatorPayload = await this.ema(ds.close, 100);
        counter[ema_100.a] += 1;
        const ema_200: ITAIndicatorPayload = await this.ema(ds.close, 200);
        counter[ema_200.a] += 1;

        // Calculate the SMAs
        const sma_10: ITAIndicatorPayload = await this.sma(ds.close, 10);
        counter[sma_10.a] += 1;
        const sma_20: ITAIndicatorPayload = await this.sma(ds.close, 20);
        counter[sma_20.a] += 1;
        const sma_30: ITAIndicatorPayload = await this.sma(ds.close, 30);
        counter[sma_30.a] += 1;
        const sma_50: ITAIndicatorPayload = await this.sma(ds.close, 50);
        counter[sma_50.a] += 1;
        const sma_100: ITAIndicatorPayload = await this.sma(ds.close, 100);
        counter[sma_100.a] += 1;
        const sma_200: ITAIndicatorPayload = await this.sma(ds.close, 200);
        counter[sma_200.a] += 1;

        // Calculate the HMA
        const hma_9: ITAIndicatorPayload = await this.hma(ds.close, 9);
        counter[hma_9.a] += 1;

        // Finally, return the build
        return {
            counter: counter,
            ema_10: ema_10,
            ema_20: ema_20,
            ema_30: ema_30,
            ema_50: ema_50,
            ema_100: ema_100,
            ema_200: ema_200,
            sma_10: sma_10,
            sma_20: sma_20,
            sma_30: sma_30,
            sma_50: sma_50,
            sma_100: sma_100,
            sma_200: sma_200,
            hma_9: hma_9
        }
    } 






    /**
     * Builds the oscillators data based on a given dataset.
     * @param ds 
     * @param maCounter 
     * @returns Promise<ITAOscillatorsBuild>
     */
    private async buildOscillators(ds: ITADataset, maCounter: ITAIndicatorActionCounter): Promise<ITAOscillatorsBuild> {
        // Initialize the counter
        let counter: ITAIndicatorActionCounter = { BUY: 0, SELL: 0, NEUTRAL: 0 };

        // Calculate the RSI
        const rsi_14: ITAIndicatorPayload = await this.rsi(ds.close, 14);
        counter[rsi_14.a] += 1;

        // Calculate the CCI
        const cci_20: ITAIndicatorPayload = await this.cci(ds.high, ds.low, ds.close, 20);
        counter[cci_20.a] += 1;

        // Calculate the ADX
        const adx_14: ITAIndicatorPayload = await this.adx(ds.high, ds.low, ds.close, 14, maCounter);
        counter[adx_14.a] += 1;

        // Calculate the AO
        const ao: ITAIndicatorPayload = await this.ao(ds.high, ds.low);
        counter[ao.a] += 1;

        // Calculate the MOM
        const mom_10: ITAIndicatorPayload = await this.mom(ds.close, 10);
        counter[mom_10.a] += 1;

        // Calculate the MACD
        const macd_12_26_9: ITAIndicatorPayload = await this.macd(ds.close, 12, 26, 9);
        counter[macd_12_26_9.a] += 1;

        // Calculate the Stoch
        const stoch_14_1_3: ITAIndicatorPayload = await this.stoch(ds.high, ds.low, ds.close, 14, 1, 3);
        counter[stoch_14_1_3.a] += 1;

        // Calculate the Stoch RSI
        const stochrsi_14: ITAIndicatorPayload = await this.stochrsi(ds.close, 14);
        counter[stochrsi_14.a] += 1;

        // Calculate the WILLR
        const willr_14: ITAIndicatorPayload = await this.willr(ds.high, ds.low, ds.close, 14);
        counter[willr_14.a] += 1;

        // Calculate the ULTOSC
        const ultosc_7_14_28: ITAIndicatorPayload = await this.ultosc(ds.high, ds.low, ds.close, 7, 14, 28);
        counter[ultosc_7_14_28.a] += 1;

        // Finally, return the build
        return {
            counter: counter,
            rsi_14: rsi_14,
            cci_20: cci_20,
            adx_14: adx_14,
            ao: ao,
            mom_10: mom_10,
            macd_12_26_9: macd_12_26_9,
            stoch_14_1_3: stoch_14_1_3,
            stochrsi_14: stochrsi_14,
            willr_14: willr_14,
            ultosc_7_14_28: ultosc_7_14_28
        }
    } 











    /************
     * Datasets *
     ************/





    
    /**
     * Retrieves the required number of prediction candlesticks,
     * merges them accordingly and build the datasets.
     * @returns ITADatasets
     */
    private makeDatasets(): ITADatasets {
        // Retrieve the raw prediction candlesticks
        const candlesticks: ICandlestick[] = this.getRawPredictionCandlesticks();

        // Build the datasets by merging the raw candlesticks accordingly
        return {
            "30m": this.makeDataset(candlesticks.slice(-this.windowSize)),
            "1h": this.makeDataset(this.mergeCandlesticks(
                candlesticks.slice((60 / this._candlestickModel.predictionConfig.intervalMinutes) * this.windowSize)
            )),
            "2h": this.makeDataset(this.mergeCandlesticks(
                candlesticks.slice((120 / this._candlestickModel.predictionConfig.intervalMinutes) * this.windowSize)
            )),
            "4h": this.makeDataset(this.mergeCandlesticks(
                candlesticks.slice((240 / this._candlestickModel.predictionConfig.intervalMinutes) * this.windowSize)
            )),
            "1d": this.makeDataset(this.mergeCandlesticks(candlesticks)),
        };
    }





    /**
     * Builds a dataset based on a given list of candlesticks.
     * @param candlesticks 
     * @returns ITADataset
     */
    private makeDataset(candlesticks: ICandlestick[]): ITADataset {
        // Init the ds
        let ds: ITADataset = { open: [], high: [], low: [], close: [], volume: [] };

        // Iterate over each candlestick and build the dataset
        for (let candlestick of candlesticks) {
            ds.open.push(candlestick.o);
            ds.high.push(candlestick.h);
            ds.low.push(candlestick.l);
            ds.close.push(candlestick.c);
            ds.volume.push(candlestick.v);
        }

        // Finally, return the dataset
        return ds;
    }





    /**
     * Given a list of raw candlesticks, it will merge them in even groups
     * so they match the window size.
     * @param rawCandlesticks 
     * @returns ICandlestick[]
     */
    private mergeCandlesticks(rawCandlesticks: ICandlestick[]): ICandlestick[] {
        // Init the list of merged candlesticks
        let merged: ICandlestick[] = [];

        // Calculate the number of candlesticks that will be merged at a time
        const mergeSize: number = rawCandlesticks.length / this.windowSize;

        // Iterate over the candlesticks in a grouped manner and merge them accordingly
        for (let i = 0; i < rawCandlesticks.length; i = i + mergeSize) {
            merged.push(this._candlestickModel.mergeCandlesticks(rawCandlesticks.slice(i, i + mergeSize)))
        }

        // Finally, return the merged candlesticks
        return merged;
    }







    /**
     * Retrieves all the candlesticks required in order to
     * build the datasets.
     * @returns ICandlestick[]
     */
    private getRawPredictionCandlesticks(): ICandlestick[] {
        // Calculate the total number of prediction candlesticks required for the daily interval
        const minutesInADay: number = 60 * 24;
        const candlesticksInADay: number = minutesInADay / this._candlestickModel.predictionConfig.intervalMinutes;
        const requirement: number = candlesticksInADay * this.windowSize;

        // Retrieve the candlesticks from the lookback
        const candlesticks: ICandlestick[] = this._candlestick.predictionLookback.slice(-(requirement));

        // Ensure there are enough candlesticks for the window
        if (candlesticks.length != requirement) {
            throw new Error(this._utils.buildApiError(`The retrieved candlesticks are not sufficient to generate the
            trading analysis state. Has: ${candlesticks.length}. Needs: ${requirement}`, 28500));
        }

        // Finally, return the list
        return candlesticks;
    }
















    /*********************************
     * Technical Analysis Indicators *
     *********************************/




    /* Oscillators */


    /**
     * Calculates the relative strength index.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async rsi(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current RSI
        const rsi: number[] = await this._rsi(close, period);
        const current: number = rsi.at(-1);
        const prev: number = rsi.at(-2);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (current < 30 && current > prev) { action = "BUY" } 
        else if (current > 70 && current < prev) { action = "SELL" }  

        // Finally, return the payload
        return { v: [current], a: action }
    }
    private _rsi(close: number[], period: number): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.rsi.indicator([close], [period], (err, results) => {
                if (err) reject(`RSI_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0]);
            });
        });
    }




    /**
     * Calculates the commodity channel index.
     * @param high 
     * @param low 
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async cci(high: number[], low: number[], close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current CCI
        const cci: number[] = await this._cci(high, low, close, period);
        const current: number = cci.at(-1);
        const prev: number = cci.at(-2);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (current < -100 && current > prev) { action = "BUY" } 
        else if (current > 100 && current < prev)  { action = "SELL" }  

        // Finally, return the payload
        return { v: [current], a: action }
    }
    private _cci(high: number[], low: number[], close: number[], period: number): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.cci.indicator([high, low, close], [period], (err, results) => {
                if (err) reject(`CCI_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0]);
            });
        });
    }



    /**
     * Calculates the average directional movement index.
     * @param high 
     * @param low 
     * @param close 
     * @param period 
     * @param maCounter 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async adx(
        high: number[], 
        low: number[], 
        close: number[], 
        period: number, 
        maCounter: ITAIndicatorActionCounter
    ): Promise<ITAIndicatorPayload> {
        // Calculate the current ADX
        const adx: number = await this._adx(high, low, close, period);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (adx >= 25 && maCounter.BUY > maCounter.SELL) { action = "BUY" } 
        else if (adx >= 25 && maCounter.SELL > maCounter.BUY)  { action = "SELL" }

        // Finally, return the payload
        return { v: [adx], a: action }
    }
    private _adx(high: number[], low: number[], close: number[], period: number): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.adx.indicator([high, low, close], [period], (err, results) => {
                if (err) reject(`ADX_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }





    /**
     * Calculates the average directional movement index.
     * @param high 
     * @param low 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async ao(high: number[], low: number[]): Promise<ITAIndicatorPayload> {
        // Calculate the current AO
        const ao: number = await this._ao(high, low);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (ao > 0) { action = "BUY" } 
        else if (ao < 0)  { action = "SELL" }

        // Finally, return the payload
        return { v: [ao], a: action }
    }
    private _ao(high: number[], low: number[]): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.ao.indicator([high, low], [], (err, results) => {
                if (err) reject(`AO_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }





    /**
     * Calculates the momentum.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async mom(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current MOM
        const mom: number[] = await this._mom(close, period);
        const current: number = mom.at(-1);
        const prev: number = mom.at(-2);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (current > prev) { action = "BUY" } 
        else if (current < prev)  { action = "SELL" }

        // Finally, return the payload
        return { v: [current], a: action }
    }
    private _mom(close: number[], period: number): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.mom.indicator([close], [period], (err, results) => {
                if (err) reject(`MOM_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0]);
            });
        });
    }




    /**
     * Calculates the macd.
     * @param close 
     * @param shortPeriod 
     * @param longPeriod 
     * @param signalPeriod 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async macd(
        close: number[], 
        shortPeriod: number, 
        longPeriod: number, 
        signalPeriod: number
    ): Promise<ITAIndicatorPayload> {
        // Calculate the current MACD
        const macd: number[] = await this._macd(close, shortPeriod, longPeriod, signalPeriod);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (macd[0] > macd[1]) { action = "BUY" } 
        else if (macd[0] < macd[1]) { action = "SELL" }  

        // Finally, return the payload
        return { v: macd, a: action }
    }
    private _macd(
        close: number[], 
        shortPeriod: number, 
        longPeriod: number, 
        signalPeriod: number
    ): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.macd.indicator(
                [close], 
                [shortPeriod, longPeriod, signalPeriod], 
                (err, results) => {
                    if (err) reject(`MACD_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve([results[0].at(-1), results[1].at(-1), results[2].at(-1)]);
            });
        });
    }




    /**
     * Calculates the stochastic oscillator.
     * @param high 
     * @param low 
     * @param close 
     * @param kPeriod 
     * @param kSlowingPeriod 
     * @param dPeriod 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async stoch(
        high: number[], 
        low: number[], 
        close: number[], 
        kPeriod: number, 
        kSlowingPeriod: number, 
        dPeriod: number
    ): Promise<ITAIndicatorPayload> {
        // Calculate the current Stoch
        const stoch: number[] = await this._stoch(high, low, close, kPeriod, kSlowingPeriod, dPeriod);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (stoch[0] < 20 && stoch[1] < 20 && stoch[0] > stoch[1]) { action = "BUY" } 
        else if (stoch[0] > 80 && stoch[1] > 80 && stoch[0] < stoch[1]) { action = "SELL" }  

        // Finally, return the payload
        return { v: stoch, a: action }
    }
    private _stoch(
        high: number[], 
        low: number[], 
        close: number[], 
        kPeriod: number, 
        kSlowingPeriod: number, 
        dPeriod: number
    ): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.stoch.indicator(
                [high, low, close], 
                [kPeriod, kSlowingPeriod, dPeriod], 
                (err, results) => {
                if (err) reject(`STOCH_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve([results[0].at(-1), results[1].at(-1)]);
            });
        });
    }




    /**
     * Calculates the stoch relative strength index.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async stochrsi(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current Stoch RSI
        const stochRSI: number[] = await this._stochrsi(close, period);
        const current: number = stochRSI.at(-1);
        const prev: number = stochRSI.at(-2);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (current < 0.2 && current > prev) { action = "BUY" } 
        else if (current > 0.8 && current < prev) { action = "SELL" }  

        // Finally, return the payload
        return { v: [current], a: action }
    }
    private _stochrsi(close: number[], period: number): Promise<number[]> {
        return new Promise((resolve, reject) => {
            tulind.indicators.stochrsi.indicator([close], [period], (err, results) => {
                if (err) reject(`STOCHRSI_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0]);
            });
        });
    }








    /**
     * Calculates the williams percent change.
     * @param high 
     * @param low 
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async willr(high: number[], low: number[], close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current WILLR%
        const willr: number = await this._willr(high, low, close, period);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (willr <= -80)  { action = "BUY" } 
        else if (willr >= -20)  { action = "SELL" }

        // Finally, return the payload
        return { v: [willr], a: action }
    }
    private _willr(high: number[], low: number[], close: number[], period: number): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.willr.indicator([high, low, close], [period], (err, results) => {
                if (err) reject(`WILLR_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }





    /**
     * Calculates the ultimate oscillator.
     * @param high 
     * @param low 
     * @param close 
     * @param shortPeriod 
     * @param mediumPeriod 
     * @param longPeriod 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async ultosc(
        high: number[], 
        low: number[], 
        close: number[], 
        shortPeriod: number, 
        mediumPeriod: number, 
        longPeriod: number
    ): Promise<ITAIndicatorPayload> {
        // Calculate the current ULTOSC
        const ultosc: number = await this._ultosc(high, low, close, shortPeriod, mediumPeriod, longPeriod);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (ultosc > 70) { action = "BUY" } 
        else if (ultosc < 30) { action = "SELL" }

        // Finally, return the payload
        return { v: [ultosc], a: action }
    }
    private _ultosc(
        high: number[], 
        low: number[], 
        close: number[], 
        shortPeriod: number, 
        mediumPeriod: number, 
        longPeriod: number
    ): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.ultosc.indicator(
                [high, low, close], 
                [shortPeriod, mediumPeriod, longPeriod], 
                (err, results) => {
                if (err) reject(`ULTOSC_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }










    /* Moving Averages */




    /**
     * Calculates the exponential moving average.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async ema(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current EMA
        const ema: number = await this._ema(close, period);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (ema < close.at(-1)) { action = "BUY" } 
        else if (ema > close.at(-1)) { action = "SELL" }  

        // Finally, return the payload
        return { v: [ema], a: action }
    }
    private _ema(close: number[], period: number): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.ema.indicator([close], [period], (err, results) => {
                if (err) reject(`EMA_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }



    /**
     * Calculates the simple moving average.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async sma(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current SMA
        const sma: number = await this._sma(close, period);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (sma < close.at(-1)) { action = "BUY" } 
        else if (sma > close.at(-1)) { action = "SELL" }  

        // Finally, return the payload
        return { v: [sma], a: action }
    }
    private _sma(close: number[], period: number): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.sma.indicator([close], [period], (err, results) => {
                if (err) reject(`SMA_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }



    /**
     * Calculates the hull moving average.
     * @param close 
     * @param period 
     * @returns Promise<ITAIndicatorPayload>
     */
    private async hma(close: number[], period: number): Promise<ITAIndicatorPayload> {
        // Calculate the current SMA
        const hma: number = await this._hma(close, period);

        // Suggest an action
        let action: ITAIndicatorAction = "NEUTRAL";
        if      (hma < close.at(-1)) { action = "BUY" } 
        else if (hma > close.at(-1)) { action = "SELL" }  

        // Finally, return the payload
        return { v: [hma], a: action }
    }
    private _hma(close: number[], period: number): Promise<number> {
        return new Promise((resolve, reject) => {
            tulind.indicators.hma.indicator([close], [period], (err, results) => {
                if (err) reject(`HMA_ERROR: ${this._utils.getErrorMessage(err)}`);
                resolve(results[0].at(-1));
            });
        });
    }














    /****************
     * Misc Helpers *
     ****************/






    /**
     * Retrieves the module's default state.
     * @returns ITAState
     */
    public getDefaultState(): ITAState {
        return {
            "30m": this.getDefaultIntervalState(),
            "1h": this.getDefaultIntervalState(),
            "2h": this.getDefaultIntervalState(),
            "4h": this.getDefaultIntervalState(),
            "1d": this.getDefaultIntervalState(),
            ts: Date.now()
        }
    }





    /**
     * Builds the default interval state object.
     * @returns ITAIntervalState
     */
    private getDefaultIntervalState(): ITAIntervalState {
        return {
            s: {a: 0, b: 0, s: 0, n: 0 },
            o: {a: 0, b: 0, s: 0, n: 0 },
            m: {a: 0, b: 0, s: 0, n: 0 },
            p: {
                rsi_14: { v: [0], a: "NEUTRAL"},
                cci_20: { v: [0], a: "NEUTRAL"},
                adx_14: { v: [0], a: "NEUTRAL"},
                ao: { v: [0], a: "NEUTRAL"},
                mom_10: { v: [0], a: "NEUTRAL"},
                macd_12_26_9: { v: [0, 0, 0], a: "NEUTRAL"},
                stoch_14_1_3: { v: [0, 0], a: "NEUTRAL"},
                stochrsi_14: { v: [0], a: "NEUTRAL"},
                willr_14: { v: [0], a: "NEUTRAL"},
                ultosc_7_14_28: { v: [0], a: "NEUTRAL"},
                ema_10: { v: [0], a: "NEUTRAL"},
                ema_20: { v: [0], a: "NEUTRAL"},
                ema_30: { v: [0], a: "NEUTRAL"},
                ema_50: { v: [0], a: "NEUTRAL"},
                ema_100: { v: [0], a: "NEUTRAL"},
                ema_200: { v: [0], a: "NEUTRAL"},
                sma_10: { v: [0], a: "NEUTRAL"},
                sma_20: { v: [0], a: "NEUTRAL"},
                sma_30: { v: [0], a: "NEUTRAL"},
                sma_50: { v: [0], a: "NEUTRAL"},
                sma_100: { v: [0], a: "NEUTRAL"},
                sma_200: { v: [0], a: "NEUTRAL"},
                hma_9: { v: [0], a: "NEUTRAL"},
            }
        }
    }
}