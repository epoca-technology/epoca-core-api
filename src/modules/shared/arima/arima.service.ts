import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../../symbols";
import { IErrorService } from "../error";
import { IArimaService } from "./interfaces";
const ARIMA = require('arima');
import {BigNumber} from 'bignumber.js';




@injectable()
export class ArimaService implements IArimaService {
    // Inject dependencies
    @inject(SYMBOLS.ErrorService)           private _e: IErrorService;

    constructor() {}





    public arima(data: number[], p?: number, d?: number, q?: number): number {
            // Make sure the provided data is valid and at least 10 items have been provided
            if (typeof data != "object" || data.length < 5) {
                throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
            }

            // Init Arima
            const arima = new ARIMA({
                p: p || 1,
                d: d || 0,
                q: q || 1,
                verbose: false
            }).train(data);
            
            // Predict next value
            const [pred, errors] = arima.predict(1);
            if (typeof pred != "object" || !pred.length) {
                console.log(pred);
                throw new Error('Arima forecasted an invalid value.');
            }

            // Return Results
            return this.getExpectedPercentageChange(data[data.length - 1], pred[0]);
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
        return this.getExpectedPercentageChange(data[data.length - 1], pred[0]);
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
    ): number {
        // Make sure the provided data is valid and at least 10 items have been provided
        if (typeof data != "object" || data.length < 5) {
            throw new Error('Arima requires at least 5 items in order to be build the perform the forecast.');
        }

        // Init Arima
        const arima = new ARIMA({
            p: p || 2,
            d: d || 1,
            q: q || 2,
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
        return this.getExpectedPercentageChange(data[data.length - 1], pred[0]);
}













    private getExpectedPercentageChange(lastPrice: number, forecastedPrice: number): number {
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
        if (change < -50 || change > 50)  return 0;

        // Return the forecasted change
        return change;
    }
}

