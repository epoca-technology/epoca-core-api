import {inject, injectable} from "inversify";
const ARIMA = require('arima');
import { ITrendForecastService, ITrendForecastConfig, ITrendForecastResult } from "./interfaces";
import { SYMBOLS, ITendencyForecast, ICandlestickSeries } from "../../../types";
import { IUtilitiesService } from "../utilities";

@injectable()
export class TrendForecastService implements ITrendForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;




    public forecast(series: ICandlestickSeries, config?: ITrendForecastConfig): ITrendForecastResult {
        // Make sure that enough series have been provided
        if (typeof series != "object" || series.length < 10) {
            throw new Error('At least 10 series items are required in order to perform a forecast.');
        }

        return {
            result: this.arima(this._utils.filterList(series, 4, 'toNumber', 0), 7, 1, 3)
        }
    }









    /* Arima */


    private arima(numberSeries: number[], p: number, d: number, q: number): ITendencyForecast {
            // Init Arima
            const arima = new ARIMA({
                p: p,
                d: d,
                q: q,
                verbose: false
            }).train(numberSeries);
            
            // Predict next value
            const [pred, errors] = arima.predict(1);
            if (typeof pred != "object" || !pred.length) {
                console.log(pred);
                throw new Error('Arima forecasted an invalid value.');
            }

            // Return Results
            return this.getForecastedTendency(numberSeries[numberSeries.length - 1], pred[0]);
    }









    private getForecastedTendency(lastPrice: number, forecastedPrice: number): ITendencyForecast {
        if (forecastedPrice > lastPrice) {
            return 1;
        }
        else if (lastPrice > forecastedPrice) {
            return -1;
        }
        else {
            return 0;
        }
    }
}