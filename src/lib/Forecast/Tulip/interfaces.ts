import { IIntensity, ITendencyForecast, IForecastProvider, ITendencyForecastExtended } from "../interfaces";
import { ICandlestickSeries, IVerbose } from "../../../types";





// Class
export interface ITulip extends IForecastProvider {



    // Test Helpers
    isCloseEnough(value1: number, value2: number, allowedDifference?: number): boolean,
}


// Config
export interface ITulipConfig {
    maPeriods?: IMAPeriods,
    spanImportance?: ISpanImportance,
    maDust?: number,
    verbose?: IVerbose
}


export interface IMAPeriods { MA1: number, MA2: number, MA3: number}

export interface ISpanImportance {oneMonth: number,twoWeeks: number,oneWeek: number,threeDays: number};






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









/* Moving Averages Specifics */


export interface ISpanMA {
    ma1: number[],
    ma2: number[],
    ma3: number[],
}






export interface IMAResult {
    tendency: ITendencyForecast,
    oneMonth: ISpanResult,
    twoWeeks: ISpanResult,
    oneWeek: ISpanResult,
    threeDays: ISpanResult,
}



export interface ISpanResult {
    tendency: ITendencyForecast,
    points: IPoints
}


export interface IPoints {
    long: number,
    short: number,
    neutral: number,
}





/* Outcomes */

export interface IMASpanOutcomes {
    MA1: IMAOutcome,
    MA2: IMAOutcome,
    MA3: IMAOutcome,
}

export interface IMAOutcome {
    tendency: ITendencyForecast,
    intensity: IIntensity
}












