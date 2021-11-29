import {inject, injectable} from "inversify";
const ARIMA = require('arima');
const timeseries = require("timeseries-analysis");
const nostradamus = require("nostradamus");
import { SYMBOLS } from "../../../types";
import { IArimaForecast, IArimaService, IArimaPrices, IArimaForecastedTendency } from "./interfaces";
import {BigNumber} from 'bignumber.js';
import { IUtilitiesService } from "../utilities";




@injectable()
export class ArimaService implements IArimaService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _e: IUtilitiesService;

    // Compact List Config
    private readonly compactListSize: number = 20;

    constructor() {}

    public forecastTendency(numberSeries: number[], fullPrices?: IArimaPrices): any {
        // Make sure the last has as many items as the required minimum for compact list size
        if (typeof numberSeries != "object" || numberSeries.length < 10) {
            throw new Error(`The number series must contain at least 10 items.`);
        }

        //numberSeries = this.getCompactNumberSeries(numberSeries);

        //const arima1:number = this.arima(numberSeries, 9, 2, 5);
        //const arima2:number = this.arima(numberSeries, 7, 1, 3);


        return {result: this.getMostDominantResult([
            this.sarima(numberSeries, 2, 1, 2),
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



    private getMostDominantResult(results: IArimaForecastedTendency[]): IArimaForecastedTendency {
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

    /*public forecastTendency(numberSeries: number[]): IArimaForecast {
        // Make sure the last has as many items as the required minimum for compact list size
        if (typeof numberSeries != "object" || numberSeries.length < 10) {
            throw new Error(`The number series must contain at least 10 items.`);
        }


        // Perform all analysis
        const arima: IArimaForecastedTendency = this.arima(numberSeries, 6, 1, 8);
        //const arima: IArimaForecastedTendency = this.sarima(numberSeries);
        //const arimaAlt: IArimaForecastedTendency = this.arimaAlt(data);


        // Return the results
        return {
            result: arima,
            arima: arima,
            sarima: arima
        };
    }*/

    /*public forecastTendency(numberSeries: number[]): IArimaForecast {
        // Make sure the last has as many items as the required minimum for compact list size
        if (typeof numberSeries != "object" || numberSeries.length < this.compactListSize) {
            throw new Error(`The number series must contain at least ${this.compactListSize} items.`);
        }

        // Build the compact number series
        const compactNumberSeries: number[] = this.getCompactNumberSeries(numberSeries);

        // Perform all analysis
        const arima: IArimaForecastedTendency = this.arima(numberSeries);
        const sarima: IArimaForecastedTendency = this.sarima(numberSeries);
        //const arimaAlt: IArimaForecastedTendency = this.arimaAlt(data);

        // Perform Compact Analysis
        const compactArima: IArimaForecastedTendency = this.arima(compactNumberSeries);
        const compactSarima: IArimaForecastedTendency = this.sarima(compactNumberSeries);

        // Return the results
        return this.getForecastResult(arima, sarima, compactArima, compactSarima);
    }*/





    private getForecastResult(
        arima: IArimaForecastedTendency,
        sarima: IArimaForecastedTendency,
        compactArima: IArimaForecastedTendency,
        compactSarima: IArimaForecastedTendency
    ): IArimaForecast {
        // Init the forecast
        let forecast: IArimaForecast = {
            result: 0,
            arima: arima,
            sarima: sarima,
            compactArima: compactArima,
            compactSarima: compactSarima
        }

        // Check if arima and sarima agree
        if (arima == sarima) {
            forecast.result = arima;
        }
        // Check if there is a match with the compact analysis
        else {
            if (arima == compactArima && arima == compactSarima) {
                forecast.result = arima;
            }
            else if (sarima == compactArima && sarima == compactSarima) {
                forecast.result = sarima;
            }
        }

        // Return the final forecast
        return forecast;
    }








    private getCompactNumberSeries(numberSeries: number[]): number[] {
        let list: number[] = [];
        const distance: number = new BigNumber(numberSeries.length).dividedBy(this.compactListSize).decimalPlaces(0).toNumber();
        for (let i = 0; i < numberSeries.length; i += distance) {
            if (list.length < this.compactListSize) {
                list.push(numberSeries[i] || numberSeries[numberSeries.length - 1]);
            }
        }
        return list;
    }







    private getArimaForecastResult(
        arima: IArimaForecastedTendency, 
        sarima: IArimaForecastedTendency, 
        arimaAlt: IArimaForecastedTendency
    ): IArimaForecastedTendency {
        if (arima == sarima || arima == arimaAlt) {
            return arima;
        }
        else if (sarima == arimaAlt) {
            return sarima;
        }
        else {
            return 0;
        }
    }














    public arima(data: number[], p: number, d: number, q: number): any {
            // Make sure the provided data is valid and at least 10 items have been provided
            if (typeof data != "object" || data.length < 5) {
                throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
            }

            // Init Arima
            const arima = new ARIMA({
                p: p,
                d: d,
                q: q,
                verbose: false
            }).train(data);
            
            // Predict next value
            const [pred, errors] = arima.predict(1);
            if (typeof pred != "object" || !pred.length) {
                console.log(pred);
                throw new Error('Arima forecasted an invalid value.');
            }

            // Return Results
            return this.getForecastedTendency(data[data.length - 1], pred[0]);
            //return this.getExpectedPercentageChange(data[data.length - 1], pred[0]);
    }








    /*public autoArima(data: number[]): number {
        // Make sure the provided data is valid and at least 10 items have been provided
        if (typeof data != "object" || data.length < 5) {
            throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
        }

        // Init Arima
        const arima = new ARIMA({ auto: true, verbose: false }).fit(data)
        
        // Predict next value
        const [pred, errors] = arima.predict(1);
        if (typeof pred != "object" || !pred.length) {
            console.log(pred);
            throw new Error('Arima forecasted an invalid value.');
        }

        // Return Results
        return this.getForecastedTendency(data[data.length - 1], pred[0]);
        //return this.getExpectedPercentageChange(data[data.length - 1], pred[0]);
    }*/









    public sarima(
        data: number[], 
        p?: number, 
        d?: number, 
        q?: number, 
        P?: number,
        D?: number,
        Q?: number,
        s?: number
    ): IArimaForecastedTendency {
        // Make sure the provided data is valid and at least 10 items have been provided
        if (typeof data != "object" || data.length < 5) {
            throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
        }

        // Init Arima
        const arima = new ARIMA({
            p: p || 7,
            d: d || 1,
            q: q || 3,
            P: P || 1,
            D: D || 0,
            Q: Q || 1,
            s: s || 12,
            verbose: false
        }).train(data);
        
        // Predict next value
        const [pred, errors] = arima.predict(1);
        if (typeof pred != "object" || !pred.length) {
            console.log(pred);
            throw new Error('Sarima forecasted an invalid value.');
        }

        // Return Results
        console.log(pred[0]);
        return this.getForecastedTendency(data[data.length - 1], pred[0]);
    }








    /*public sarimax(priceList: number[], timestampList: number[], p?: number, d?: number, q?: number): IArimaForecastedTendency {
        // Make sure the provided data is valid and at least 10 items have been provided
        if (typeof priceList != "object" || priceList.length < 5) {
            throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
        }

        // Init Arima
        const arima = new ARIMA({
            p: p || 7,
            d: d || 1,
            q: q || 3,
            transpose: true,
            verbose: false
        }).fit(priceList, timestampList);
        
        // Predict next value
        const [pred, errors] = arima.predict(1, timestampList);
        if (typeof pred != "object" || !pred.length) {
            console.log(pred);
            throw new Error('Sarimax forecasted an invalid value.');
        }

        // Return Results
        return this.getForecastedTendency(priceList[priceList.length - 1], pred[0]);
    }*/






    public arimaAlt(data: IArimaPrices): IArimaForecastedTendency {
        // Make sure the provided data is valid and at least 10 items have been provided
        if (typeof data != "object" || data.length < 5) {
            throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
        }

        // Load data
        const ts = new timeseries.main(data);
        //const t = new ts.main(timeseries.sin({cycles:4}));

        // We calculate the AR coefficients of the current points
        const coeffs = ts.ARMaxEntropy({
            data:	ts.data.slice()
        });

        let forecast = 0;	// Init the value at 0.
        for (var i=0;i<coeffs.length;i++) {	// Loop through the coefficients
            forecast -= ts.data[(data.length-1)-i][1]*coeffs[i];
            // Explanation for that line:
            // t.data contains the current dataset, which is in the format [ [date, value], [date,value], ... ]
            // For each coefficient, we substract from "forecast" the value of the "N - x" datapoint's value, multiplicated by the coefficient, where N is the last known datapoint value, and x is the coefficient's index.
        }
        // Return Results
        return this.getForecastedTendency(data[data.length - 1][1], forecast);
        //return forecast;
    }








    public nostradamus(numberSeries: number[]): any {
        const prediction: any = nostradamus(
            numberSeries,
            0.9,  // alpha: overall smoothing component
            0.8,   // beta: trend smoothing component
            0.8,   // gamma: seasonal smoothing component
            4,   // period: # of observations per season
            1,   // m: # of future observations to forecast
        );
        //console.log(prediction);
        //console.log(prediction.length);
        let acum: BigNumber = new BigNumber(0);
        let items: number = 0;
        for (let p of prediction) {
            if (p > 0){
                acum = acum.plus(p);
                items += 1;
            }
        }
        const nextPrice: number = acum.dividedBy(items).decimalPlaces(2).toNumber();
        //console.log(acum.dividedBy(items).decimalPlaces(2).toNumber());
        return this.getForecastedTendency(numberSeries[numberSeries.length - 1], nextPrice);
    }













    private getForecastedTendency(lastPrice: number, forecastedPrice: number): IArimaForecastedTendency {
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








    private getExpectedPercentageChange(lastPrice: number, forecastedPrice: number, maxChange: number = 30): number {
        // Init result
        let change: number = 0;

        // Handle an increase
        if (forecastedPrice > lastPrice) {
            const increase: number = forecastedPrice - lastPrice;
            change = new BigNumber(increase).dividedBy(lastPrice).times(100).decimalPlaces(2).toNumber();
        } 
        
        // Handle a decrease
        else if (lastPrice > forecastedPrice){
            const decrease: number = lastPrice - forecastedPrice;
            change = new BigNumber(decrease).dividedBy(lastPrice).times(100).times(-1).decimalPlaces(2).toNumber();
        }

        // Limit the result to 10
        //if (change < -(maxChange) || change > maxChange)  return 0;

        // Return the forecasted change
        return change;
    }
}

