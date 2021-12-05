import {appContainer} from "../../../ioc";
import { ICandlestickSeries, IVerbose, SYMBOLS } from "../../../types";
import { ITendencyForecast, ITendencyForecastExtended, IForecastProviderResult } from "../interfaces";
import { 
    ITulip, 
    ITulipConfig, 
    ISpanSeries, 
    ISpan, 
    IMacdResult,
    IBollingerBandsResult
} from "./interfaces";
import * as tulind from "tulind";
import {BigNumber} from "bignumber.js";



// Init Utilities Service
import { IUtilitiesService } from "../../../modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




export class Tulip implements ITulip {
    /**
     * @series
     * This object contains the formated series for each of the time spans.
     * It is recommended to initialize this class with 720 hourly candlesticks.
     */
    private series: ISpan;





    
    /**
     * @verbose
     * Displays additional data of the process for debugging purposes.
     * DEFAULT: 0
     */
     private readonly verbose: IVerbose = 0;

    






    constructor(series: ICandlestickSeries, config: ITulipConfig) {
        // Make sure the series is valid
        if (series.length < 715 || series.length > 730) throw new Error('The series must contain between 715 and 730 candlesticks.'); 

        // Init the series
        this.series = this.getSpanSeries(series);

        // Set Verbosity
        if (typeof config.verbose == "number") this.verbose = config.verbose;
    }
    






    public async forecast(): Promise<IForecastProviderResult> {



        return {result: 1};
    }










    /* Indicators */





    /**
     * Simple Moving Average
     * The Simple Moving Average is one of the most common smoothing functions used on time series data.
     * It takes one parameter, the period n. Larger values for n will have a greater smoothing effect on 
     * the input data but will also create more lag.
     * It is calculated for each bar as the arithmetic mean of the previous n bars.
     * https://tulipindicators.org/sma
     * @param close 
     * @param period? Defaults to 5
     * @returns Promise<number[]>
     */
    public async sma(close: number[], period?: number): Promise<number[]> {
        // Caclulate the SMA
        const sma: [number[]] = await tulind.indicators.sma.indicator([close], [
            typeof period == "number" ? period: 5
        ]);

        // Return the results
        return sma[0];
    }

    






    /**
     * Exponential Moving Average
     * The exponential moving average, or exponential smoothing function, works by calculating each bar as a 
     * portion of the current input and a portion of the previous exponential moving average.
     * It takes one parameter, the period n, a positive integer. Larger values for n will have a greater 
     * smoothing effect on the input data but will also create more lag.
     * https://tulipindicators.org/ema
     * @param close 
     * @param period?  Defaults to 5
     * @returns Promise<number[]>
     */
    public async ema(close: number[], period?: number): Promise<number[]> {
        // Caclulate the EMA
        const ema: [number[]] = await tulind.indicators.ema.indicator([close], [
            typeof period == "number" ? period: 5
        ]);
        
        // Return the results
        return ema[0];
    }









    /**
     * Moving Average Convergence/Divergence
     * Moving Average Convergence/Divergence helps follow trends and has several uses.
     * It takes three parameter, a short period n, a long period m, and a signal period p.
     * https://tulipindicators.org/macd
     * @param close 
     * @param shortPeriod? 
     * @param longPeriod? 
     * @param signalPeriod? 
     * @returns Promise<IMacdResult>
     */
    public async macd(close: number[], shortPeriod?: number, longPeriod?: number, signalPeriod?: number): Promise<IMacdResult> {
        // Caclulate the MACD
        const macd: number[][] = await tulind.indicators.macd.indicator([close], [
            typeof shortPeriod == "number" ? shortPeriod: 2,
            typeof longPeriod == "number" ? longPeriod: 5,
            typeof signalPeriod == "number" ? signalPeriod: 9
        ]);
        
        // Return the results
        return {
            macd: macd[0],
            macdSignal: macd[1],
            macdHistogram: macd[2]
        };
    }










    /**
     * Relative Strength Index
     * The Relative Strength Index is a momentum oscillator to help identify trends.
     * https://tulipindicators.org/rsi
     * @param close 
     * @param period? 
     * @returns Promise<number[]>
     */
    public async rsi(close: number[], period?: number): Promise<number[]> {
        // Caclulate the RSI
        const rsi: [number[]] = await tulind.indicators.rsi.indicator([close], [
            typeof period == "number" ? period: 5
        ]);
        
        // Return the results
        return rsi[0];
    }












    /**
     * Bollinger Bands
     * The Bollinger Bands indicator calculates three results. A middle band, which is a 
     * Simple Moving Average, as well as upper and lower bands which are spaced off the middle band.
     * It takes two parameters: the period n, as well as a scaling value a. The upper and lower bands 
     * are spaced off of the middle band by a standard deviations of the input.
     * https://tulipindicators.org/bbands
     * @param close 
     * @param period? 
     * @param stddev? 
     * @returns Promise<IBollingerBandsResult>
     */
    public async bbands(close: number[], period?: number, stddev?: number): Promise<IBollingerBandsResult> {
        // Caclulate the Bollinger Bands
        const bbands: number[][] = await tulind.indicators.bbands.indicator([close], [
            typeof period == "number" ? period: 5,
            typeof stddev == "number" ? stddev: 2
        ]);
        
        // Return the results
        return {
            lower: bbands[0],
            middle: bbands[1],
            upper: bbands[2]
        };
    }















    /**
     * Positive Volume Index
     * Positive Volume Index is very similar to Negative Volume Index, but changes on volume-up days instead.
     * https://tulipindicators.org/pvi
     * @param close 
     * @param volume 
     * @returns Promise<number[]>
     */
    public async pvi(close: number[], volume: number[]): Promise<number[]> {
        // Caclulate the PVI
        const pvi: [number[]] = await tulind.indicators.pvi.indicator([close, volume], []);
        
        // Return the results
        return pvi[0];
    }









    /**
     * Negative Volume Index
     * Negative Volume Index tries to show what smart investors are doing by staying flat on up-volume 
     * days and only changing on down-volume days.
     * https://tulipindicators.org/nvi
     * @param close 
     * @param volume 
     * @returns Promise<number[]>
     */
     public async nvi(close: number[], volume: number[]): Promise<number[]> {
        // Caclulate the NVI
        const nvi: [number[]] = await tulind.indicators.nvi.indicator([close, volume], []);
        
        // Return the results
        return nvi[0];
    }














    /* Misc Helpers */







    /**
     * Checks if 2 values are close enough to be considered a match.
     * @param value1 
     * @param value2 
     * @param allowedDifference? 
     * @returns boolean
     */
    public isCloseEnough(value1: number, value2: number, allowedDifference?: number): boolean {
        // Calculate the difference between the 2 values
        const difference: number = value1 - value2;

        // Init the allowed difference
        allowedDifference = typeof allowedDifference == "number" ? allowedDifference: 0.02;

        // Check if the difference is within the allowed range
        return difference <= allowedDifference && difference >= -(allowedDifference);
    }















    





    /* Initialization Helpers */








    /**
     * Given a candlestick series, it will build the series for all time spans.
     * @param series 
     * @returns 
     */
    private getSpanSeries(series: ICandlestickSeries): ISpan {
        return {
            oneMonth: this.getSpanSeriesFromCandlesticks(series),
            twoWeeks: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 360)),
            oneWeek: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 168)),
            threeDays: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 72)),
        }
    }



    








    /**
     * Given a series of candlesticks, it will organize the data in the required format.
     * @param series 
     * @returns ISpanSeries
     */
    private getSpanSeriesFromCandlesticks(series: ICandlestickSeries): ISpanSeries {
        // Init the lists
        let spanSeries: ISpanSeries = {open: [],high: [],low: [],close: [],volume: []};

        // Iterate over the entire candlestick series and populate each property
        for (let item of series) {
            spanSeries.open.push(Number(item[1]));
            spanSeries.high.push(Number(item[2]));
            spanSeries.low.push(Number(item[3]));
            spanSeries.close.push(Number(item[4]));
            spanSeries.volume.push(Number(item[5]));
        }

        // Return the span series
        return spanSeries;
    }

    
}