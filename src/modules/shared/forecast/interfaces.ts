import { ICandlestick } from "../../../modules/shared/candlestick";



// Service
export interface IForecastService {
    forecast(series: ICandlestick[]): Promise<IForecastResult>
}






// Forecast Result
export interface IForecastResult {
    result: ITendencyForecast
}






// Tendency
export type ITendencyForecast = 1|0|-1;