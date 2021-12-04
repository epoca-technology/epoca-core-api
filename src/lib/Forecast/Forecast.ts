import { ICandlestickSeries } from "../../types";
import {IForecastConfig, IForecastResult, IForecast } from "./interfaces";
import { IForecastProviderResult, ITendencyForecastExtended } from ".";



export class Forecast implements IForecast {
    // Arima
   // private arimaConfig: IArimaConfig;
    



    constructor(config: IForecastConfig) {
        // Initialize arima's config
        //this.arimaConfig = config.arimaConfig;


    }
    





    /**
     * Given a series, it will perform all available forecasts and return a unified result.
     * @param series
     * @returns IForecastResult
     */
    public forecast(series: ICandlestickSeries): IForecastResult {
        // Initialize Arima
        //const arima: IArima = new Arima(series, this.arimaConfig);
        //onst arimaResults: IForecastProviderResult = arima.forecast();
        return {
            result: Math.random() >= 0.5 ? 1 : -1
            //result: <ITendencyForecastExtended>this.getRandomTendency()
            //result: <ITendencyForecastExtended>Math.floor(Math.random() * (2 - 0 + 1) + 0)
            //result: arimaResults.result
            //result: arimaResults.result == -1 ? 0: arimaResults.result
        }
    }




    private getRandomTendency () {
        const val: number = Math.floor(Math.random() * 2) + 1;
        if (val == 1){
            return -1
        }else {
            return 0;
        }
    }

}