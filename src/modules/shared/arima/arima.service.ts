import {inject, injectable} from "inversify";
const ARIMA = require('arima');
const timeseries = require("timeseries-analysis");
import { SYMBOLS } from "../../../symbols";
import { IErrorService } from "../error";
import { IArimaForecast, IArimaService } from "./interfaces";
//import {BigNumber} from 'bignumber.js';
import { IArimaPrices, IArimaForecastedTendency } from "../arima";




@injectable()
export class ArimaService implements IArimaService {
    // Inject dependencies
    @inject(SYMBOLS.ErrorService)           private _e: IErrorService;

    constructor() {}





    public forecastTendency(data: IArimaPrices): IArimaForecast {
        // Build the price list
        let priceList: number[] = [];
        for (let item of data) { priceList.push(item[1]) };

        // Perform all analysis
        const arima: IArimaForecastedTendency = this.arima(priceList);
        const sarima: IArimaForecastedTendency = this.sarima(priceList);
        const arimaAlt: IArimaForecastedTendency = this.arimaAlt(data);

        // Check if there was full consensus
        const fullConsensus: boolean = arima == sarima && arima == arimaAlt;

        // Return the results
        return {
            result: fullConsensus ? arima: 0,
            arima: arima,
            sarima: sarima,
            arimaAlt: arimaAlt
        }
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














    public arima(data: number[], p?: number, d?: number, q?: number): IArimaForecastedTendency {
            // Make sure the provided data is valid and at least 10 items have been provided
            if (typeof data != "object" || data.length < 5) {
                throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
            }

            // Init Arima
            const arima = new ARIMA({
                p: p || 7,
                d: d || 1,
                q: q || 3,
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








    /*private getExpectedPercentageChange(lastPrice: number, forecastedPrice: number, maxChange: number = 30): number {
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
        if (change < -(maxChange) || change > maxChange)  return 0;

        // Return the forecasted change
        return change;
    }*/
}

