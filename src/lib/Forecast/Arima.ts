import {appContainer} from "../../ioc";
import { ICandlestickSeries, SYMBOLS } from "../../../src/types";
import { IArima, ITendencyForecast, ITendencyForecastExtended, IForecastProviderResult } from "./interfaces";
const ARIMA = require('arima');


// Init Utilities Service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




export class Arima implements IArima {
    // Series to analyze
    protected series: ICandlestickSeries;

    // Number series
    private readonly numberSeries: number[];
    private readonly minItems: number = 200;



    
    constructor(series: ICandlestickSeries) {
        // Init the series
        this.series = series;

        // Populate the number series with the close prices
        this.numberSeries = _utils.filterList(series, 4, "toNumber", 0);
    }
    



    public forecast(): IForecastProviderResult {
        // Make sure the last has as many items as the required minimum for compact list size
        if (this.numberSeries.length < this.minItems) {
            throw new Error(`The number series must contain at least ${this.minItems} items.`);
        }

        //numberSeries = this.getCompactNumberSeries(numberSeries);

        //const arima1:number = this.arima(numberSeries, 9, 2, 5);
        //const arima2:number = this.arima(numberSeries, 7, 1, 3);


        return {result: this.getMostDominantResult([
            //this.sarima(numberSeries, 2, 1, 2),
            this.arima(1, 0, 1),
            //this.arima(numberSeries, 2, 1, 2),
            //this.arima(numberSeries, 5, 1, 2),
            //this.arima(numberSeries, 5, 1, 4),
            //this.arima(numberSeries, 6, 1, 2),
            //this.arima(numberSeries, 7, 1, 3),
            //this.arima(numberSeries, 8, 1, 4),
            //this.arima(numberSeries, 9, 2, 5),
            //this.sarima(numberSeries, 2, 1, 1),
            //this.sarima(numberSeries, 9, 2, 5),
            //this.arima(numberSeries, 10, 2, 6),
            //this.arimaAlt(fullPrices)
            //this.nostradamus(numberSeries)
        ])};
    }




    private getMostDominantResult(results: ITendencyForecast[]): ITendencyForecastExtended {
        let long: number = 0;
        let short: number = 0;
        let neutral: number = 0;
        for (let r of results) {
            if (r == 1) {
                long += 1;
            } else if (r == -1) {
                short += 1;
            } else {
                neutral += 1;
            }
        }
        if (long >= (results.length)) {
            return 1;
        }
        else if (short >= (results.length)) {
            return -1;
        }
        else { return 0;}
    }







    private arima(p: number, d: number, q: number): any {
        // Init Arima
        const arima = new ARIMA({
            p: p,
            d: d,
            q: q,
            verbose: false
        }).train(this.numberSeries);
        
        // Predict next value
        const [pred, errors] = arima.predict(1);
        if (typeof pred != "object" || !pred.length) {
            console.log(pred);
            throw new Error('Arima forecasted an invalid value.');
        }

        // Return Results
        return this.getForecastedTendency(this.numberSeries[this.numberSeries.length - 1], pred[0]);
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