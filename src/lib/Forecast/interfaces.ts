import { ICandlestickSeries, IVerbose } from "../../types";



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
    forecast(): IForecastProviderResult
}



/* Arima */

// Class
export interface IArima extends IForecastProvider {}

// Config
export interface IArimaConfig {
    verbose?: IVerbose
}

// Result Data
export interface IArimaResultData {
    superCool?: string
}



/* Market State */

// Class
// @TODO

// Config
// @TODO

// Result Data
export interface IMarketStateResultData {
    superCool?: string
}




// Forecast Provider Result
export interface IForecastProviderResult {
    result: ITendencyForecastExtended,
    data?: IArimaResultData|IMarketStateResultData
}








// Tendency
export type ITendencyForecast = 1|0|-1;
export type ITendencyForecastExtended = 2|1|0|-1|-2;