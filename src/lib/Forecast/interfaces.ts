import { ICandlestickSeries, IVerbose } from "../../types";
import { IArimaConfig, IArimaResultData } from "./Arima";
import { ITulipResultData } from "./Tulip";



/* General Analysis */



// Class
export interface IForecast {
    forecast(series: ICandlestickSeries): IForecastResult
}


// Config
export interface IForecastConfig {
    arimaConfig: IArimaConfig,
    verbose?: IVerbose
}


// Result
export interface IForecastResult {
    result: ITendencyForecastExtended,
    arima?: IForecastProviderResult
    marketState?: IForecastProviderResult
}






/* Forecast Provider */

// Parent Class
export interface IForecastProvider {
    forecast(): Promise<IForecastProviderResult>
}












// Forecast Provider Result
export interface IForecastProviderResult {
    result: ITendencyForecastExtended,
    data?: IArimaResultData|ITulipResultData
}








// Tendency
export type ITendencyForecast = 1|0|-1;
export type ITendencyForecastExtended = 2|1|0|-1|-2;