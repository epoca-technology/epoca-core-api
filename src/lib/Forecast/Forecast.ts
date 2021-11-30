import { ICandlestickSeries } from "../../types";
import {IArima, IForecastConfig, IForecastResult, IForecast } from "./interfaces";
import { Arima } from "./Arima";



export class Forecast implements IForecast {
    // Arima
    private arima: IArima;
    private arimaResults: IForecastResult;
    



    constructor(series: ICandlestickSeries, config?: IForecastConfig) {
        // Initialize arima's instance
        this.arima = new Arima(series);

        // Initialize market state's instance
        // @TODO

        // Initialize TA's instance
        // @TODO
    }
    





    public forecast(): IForecastResult {
        
    }



}