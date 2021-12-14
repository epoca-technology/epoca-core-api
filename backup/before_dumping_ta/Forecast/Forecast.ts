import { ICandlestickSeries } from "../../types";
import {IForecastConfig, IForecastResult, IForecast, IForecastProviderResult } from "./interfaces";



export class Forecast implements IForecast {


    constructor(config: IForecastConfig) {
        
    }
    





    /**
     * Given a series, it will perform all available forecasts and return a unified result.
     * @param series
     * @returns Promise<IForecastResult>
     */
    public async forecast(series: ICandlestickSeries): Promise<IForecastResult> {
        return {result: 0};
    }







}