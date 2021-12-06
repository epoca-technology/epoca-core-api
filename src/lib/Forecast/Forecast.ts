import { Arima, IArimaConfig } from ".";
import { ICandlestickSeries } from "../../types";
import {IForecastConfig, IForecastResult, IForecast, IForecastProviderResult } from "./interfaces";
import { ITulip, ITulipConfig, Tulip } from "./Tulip";



export class Forecast implements IForecast {
    // Tulip
    private tulipConfig: ITulipConfig;
    
    // Arima Config
    private arimaConfig: IArimaConfig;


    constructor(config: IForecastConfig) {
        // Initialize tulip's config
        this.tulipConfig = config.tulipConfig;

        this.arimaConfig = config.arimaConfig;
    }
    





    /**
     * Given a series, it will perform all available forecasts and return a unified result.
     * @param series
     * @returns Promise<IForecastResult>
     */
    public async forecast(series: ICandlestickSeries): Promise<IForecastResult> {
        // Initialize Tulip
        const tulip: ITulip = new Tulip(series, this.tulipConfig);
        const tulipForecast: IForecastProviderResult = await tulip.forecast();

        // Arima
        const arima = new Arima(series, this.arimaConfig);
        //const arimaForecast = await arima.forecast();

        /*return {
            result: tulipForecast.result == arimaForecast.result ? tulipForecast.result: 0
        }*/
       return {
            result: tulipForecast.result
        }
    }







}