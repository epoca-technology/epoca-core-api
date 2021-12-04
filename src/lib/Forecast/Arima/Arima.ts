import {appContainer} from "../../ioc";
import { ICandlestickSeries, SYMBOLS } from "../../../src/types";
import { IArima, ITendencyForecast, ITendencyForecastExtended, IForecastProviderResult, IArimaConfig } from "./interfaces";
const ARIMA = require('arima');
import {BigNumber} from "bignumber.js";

// Init Utilities Service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




export class Arima implements IArima {
    // Series to analyze
    protected series: ICandlestickSeries;

    // Number series
    private readonly numberSeries: number[];
    private readonly minItems: number = 50;

    // Compact List
    private readonly compactNumberSeries: number[];
    private readonly compactNumberSeriesSize: number = 90;

    
    constructor(series: ICandlestickSeries, config: IArimaConfig) {
        // Init the series
        this.series = series;

        // Populate the number series with the close prices
        this.numberSeries = _utils.filterList(series, 4, "toNumber", 0);

        // Populate the compact series
        this.compactNumberSeries = this.getCompactNumberSeries();
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
            /*this.arima(1, 0, 1),
            this.arima(1, 0, 1, true),
            this.arima(2, 1, 2),
            this.arima(2, 1, 2, true),*/
            
            this.arima(7, 1, 3),
            this.arima(7, 1, 3, true),
            this.arima(9, 2, 5),
            this.arima(9, 2, 5, true),

            /*this.autoArima(),
            this.autoArima(true),*/
            /*this.arima(9, 2, 5),
            this.arima(9, 2, 5, true),*/
            //this.nostradamus(),
            //this.arimaAlt(),
            /*this.arima(3, 1, 2),
            this.arima(3, 1, 2, true),*/
            //this.arima(7, 1, 3),
            //this.arima(8, 1, 4),
            /*this.arima(2, 1, 2),
            this.arima(2, 1, 2, true),
            this.arima(3, 2, 3),
            this.arima(3, 2, 3, true),*/
            //this.arima(2, 1, 1, true),
            //this.arima(7, 1, 3, true),
            //this.arima(2, 1, 1),
            //this.arima(2, 1, 1, true),
            //this.arima(9, 2, 5),
            //this.arima(3, 1, 2, true),
            //this.arima(7, 1, 3),
            //this.arima(4, 1, 3, true),

            //this.autoArima(),


            //this.arima(1, 0, 1),
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

            //this.arimaAlt()

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
        if (long >= (results.length > 1 ? results.length -1: 1)) {
            return 1;
        }
        else if (short >= (results.length > 1 ? results.length -1: 1)) {
            return -1;
        }
        else { return 0;}
    }







    private arima(p: number, d: number, q: number, compact?: boolean): any {
        // Init the series
        const series: number[] = compact ? this.compactNumberSeries: this.numberSeries;

        // Init Arima
        const arima = new ARIMA({
            p: p,
            d: d,
            q: q,
            verbose: false
        }).train(series);
        
        // Predict next value
        const [pred, errors] = arima.predict(1);
        if (typeof pred != "object" || !pred.length) {
            console.log(pred);
            throw new Error('Arima forecasted an invalid value.');
        }

        // Return Results
        return this.getForecastedTendency(series[series.length - 1], pred[0]);
    }
















    private _getForecastedTendency(lastPrice: number, forecastedPrices: number[]): ITendencyForecast {
        const change: number = _utils.calculatePercentageChange(lastPrice, forecastedPrices[forecastedPrices.length - 1], 2, true);
        //console.log(change);
        if (change >= 0) {
            return 1;
        } else if (change < 0) {
            return -1
        } else {
            return 0;
        }
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






    private getCompactNumberSeries(): number[] {
        let list: number[] = [];
        const distance: number = new BigNumber(this.numberSeries.length).dividedBy(this.compactNumberSeriesSize).decimalPlaces(0).toNumber();
        for (let i = 0; i < this.numberSeries.length; i += distance) {
            if (list.length < this.compactNumberSeriesSize) {
                list.push(this.numberSeries[i] || this.numberSeries[this.numberSeries.length - 1]);
            }
        }
        return list;
    }
}