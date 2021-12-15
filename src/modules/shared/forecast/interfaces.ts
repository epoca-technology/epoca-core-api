import { ICandlestickSeries } from "../../../modules/shared/binance";




export interface IForecastService {
    forecast(series: ICandlestickSeries): Promise<IForecastResult>
}






// Forecast Result
export interface IForecastResult {
    result: ITendencyForecast
}






// Tendency
export type ITendencyForecast = 1|0|-1;