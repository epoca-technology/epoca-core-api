import { ICandlestickSeries, ITendencyForecastExtended } from "../../../types";


// Service
export interface ITrendForecastService {
    forecast(series: ICandlestickSeries, config?: ITrendForecastConfig): ITrendForecastResult
}



// Config
export interface ITrendForecastConfig {

}



// Result
export interface ITrendForecastResult {
    result: ITendencyForecastExtended,
    // @TODO
}