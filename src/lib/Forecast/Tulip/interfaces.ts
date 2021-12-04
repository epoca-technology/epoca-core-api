import { IVerbose } from "../../../types";
import { IForecastProvider } from "../interfaces";





// Class
export interface ITulip extends IForecastProvider {

}


// Config
export interface ITulipConfig {
    verbose?: IVerbose
}


// Result Data
export interface ITulipResultData {
    superCool?: string
}



//
export interface IPeriodData {
    open: number[],
    high: number[],
    low: number[],
    close: number[],
    volume: number[]
}