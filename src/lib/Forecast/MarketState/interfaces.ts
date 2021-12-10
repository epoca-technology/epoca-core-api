import { ICandlestickSeries, IVerbose } from "../../../types";
import { IForecastProviderResult } from "../interfaces";



export interface IMarketState {
    forecast(series: ICandlestickSeries): Promise<IForecastProviderResult>
}



export interface IMarketStateConfig {
    verbose?: IVerbose
}







export type IMovingAverages = number[][];



export interface IMovingAveragesPointsSummary {
    long: number,
    short: number,
    neutral: number,
    periods: IMovingAveragesPoints[]
}



export interface IMovingAveragesPoints {
    long: number,
    short: number,
    neutral: number
}






/* Aroon */
export interface IAroonSummary {
    highPercent: number,   // %Percentage
    lowPercent: number,    // %Percentage
    periods: IAroonPoints[]
}
export interface IAroonPoints {
    high: number,
    low: number,
}



/* FOSC */
export interface IFOSCSummary {
    longPercentage: number,
    shortPercentage: number,
    periods: number[]
}


export interface IFOSCPeriod {
    long: number,
    short: number
}




/* RSI */
export interface IRSISummary {
    overbought: boolean,
    oversold: boolean,
    periods: number[]
}







// Format in which the data must be in order to interact with the Tulip Lib
export interface ITulipData {
    open: number[],
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
}










export interface ITableItem {
    date: string,
    close: string,
    ma1: string,
    ma2: string,
    ma3: string,
    ma4: string,
}