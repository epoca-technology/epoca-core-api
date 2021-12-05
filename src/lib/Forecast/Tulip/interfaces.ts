import { ICandlestickSeries, IVerbose } from "../../../types";
import { IForecastProvider } from "../interfaces";





// Class
export interface ITulip extends IForecastProvider {

    // Indicators
    sma(close: number[], period?: number): Promise<number[]>,
    ema(close: number[], period?: number): Promise<number[]>,
    macd(close: number[], shortPeriod?: number, longPeriod?: number, signalPeriod?: number): Promise<IMacdResult>,
    rsi(close: number[], period?: number): Promise<number[]>,
    bbands(close: number[], period?: number, stddev?: number): Promise<IBollingerBandsResult>,
    pvi(close: number[], volume: number[]): Promise<number[]>,
    nvi(close: number[], volume: number[]): Promise<number[]>,

    // Misc Helpers
    isCloseEnough(value1: number, value2: number, allowedDifference?: number): boolean,
}


// Config
export interface ITulipConfig {
    verbose?: IVerbose
}


// Result Data
export interface ITulipResultData {
    superCool?: string
}




// Span Names
export type ISpanName = 'oneMonth'|'twoWeeks'|'oneWeek'|'threeDays';


// Span object - Can be series or analysis results
export interface ISpan {
    oneMonth: ISpanSeries,
    twoWeeks: ISpanSeries,
    oneWeek: ISpanSeries,
    threeDays: ISpanSeries
}


// Data Required Per Span
export interface ISpanSeries {
    open: number[],
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
}







/* Specific Indicators Results */






// MACD Result
export interface IMacdResult {
    macd: number[],
    macdSignal: number[],
    macdHistogram: number[]
}







// Bollinger Bands Result
export interface IBollingerBandsResult {
    lower: number[],
    middle: number[],
    upper: number[]
}