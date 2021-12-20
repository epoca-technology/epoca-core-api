import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IForecastResult, 
    IForecastService, 
    ITendencyForecast 
} from "./interfaces";
import {EMA, RSI} from "bfx-hf-indicators";
import {BigNumber} from "bignumber.js";



@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;






    constructor() {}






    /**
     * Given a series of 1m candlesticks, it will predict the next position to be taken.
     * @param series 
     * @returns Promise<IForecastResult>
     */
    public async forecast(candlesticks1m: ICandlestick[]): Promise<IForecastResult> {
        return this.forecastWithEMA(candlesticks1m);
        //return this.forecastWithRSI(candlesticks1m);
        //return Math.random() > 0.5 ? {result: 1}: {result: -1};
    }



    













    /* TA Forecasting */





    private async forecastWithEMA(candlesticks1m: ICandlestick[]): Promise<IForecastResult> {
        // Init periods
        const shortPeriod: number = 8;
        const mediumPeriod: number = 21;
        const longPeriod: number = 50;

        // Init EMAs
        const shortEMA: EMA = new EMA([shortPeriod]);
        const mediumEMA: EMA = new EMA([mediumPeriod]);
        const longEMA: EMA = new EMA([longPeriod]);

        // Init RSI
        //const shortRSI: RSI = new RSI([shortPeriod]);
        //const mediumRSI: RSI = new RSI([mediumPeriod]);
        //const longRSI: RSI = new RSI([longPeriod]);

        // Initialize best suited candlestick interval
        const candlesticks: ICandlestick[] = this._candlestick.alterInterval(candlesticks1m, 15);
        
        // Iterate over each candlestick and calculate the indicators
        candlesticks.forEach((c) => {
            // Close Price
            const closePrice: number = <number>this._utils.outputNumber(c.c, {outputFormat: 'number'});

            // Populate the EMAs
            shortEMA.add(closePrice);
            mediumEMA.add(closePrice);
            longEMA.add(closePrice);

            // Populate the RSIs
            //shortRSI.add(closePrice);
            //mediumRSI.add(closePrice);
            //longRSI.add(closePrice);
        });

        // Initialize the tendency
        let tendency: ITendencyForecast = 0;

        // Check if there has been a crossing
        if (shortEMA.crossed(mediumEMA.v())) {
            // Set Values
            const sEMA: number = <number>this._utils.outputNumber(shortEMA.v(), {decimalPlaces: 2, outputFormat: 'number'});
            const mEMA: number = <number>this._utils.outputNumber(mediumEMA.v(), {decimalPlaces: 2, outputFormat: 'number'});
            const lEMA: number = <number>this._utils.outputNumber(longEMA.v(), {decimalPlaces: 2, outputFormat: 'number'});

            // Make sure the EMAs aren't equal
            if (sEMA != mEMA) {
                // Initialize the RSI values
                //const sRSI: number = <number>this._utils.outputNumber(shortRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});
                //const mRSI: number = <number>this._utils.outputNumber(mediumRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});
                //const lRSI: number = <number>this._utils.outputNumber(longRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});

                // Set the tendency based on the EMA Cross
                tendency = sEMA > mEMA ? 1: -1;

                // Only long when the long EMA is above the trading price
                /*if (tendency == 1 && new BigNumber(lEMA).isLessThan(candlesticks[candlesticks.length - 1].c)) {
                    console.log('Long stopped by Trend Line');
                    tendency = 0;
                }


                // Only short when the long EMA is below the trading price
                if (tendency == -1 && new BigNumber(lEMA).isGreaterThan(candlesticks[candlesticks.length - 1].c)) {
                    console.log('Short stopped by Trend Line');
                    tendency = 0;
                }*/


                // If one of the RSIs is high, neutralize the long
                /*if (tendency == 1 && (sRSI >= 65 || mRSI >= 65 || lRSI >= 65)) {
                    console.log('Long stopped by RSI');
                    tendency = 0;
                }

                // If one of the RSIs is low, neutralize the short
                else if (tendency == -1 && (sRSI <= 35 || mRSI <= 35 || lRSI <= 35)) {
                    console.log('Short stopped by RSI');
                    tendency = 0;
                }*/

                // Log it
                //if (tendency != 0) console.log(`SEMA (${sEMA}) LEMA (${lEMA})`);
                console.log(`SEMA: ${sEMA} MEMA: ${mEMA} LEMA: ${lEMA}`);
            } else {
                console.log(`Fake Cross ${shortEMA.v()} ${longEMA.v()}`);
            }
        }

        // Return the final results
        return {result: tendency};
    }







    private async forecastWithRSI(candlesticks1m: ICandlestick[]): Promise<IForecastResult> {
        // Init RSI
        const shortRSI: RSI = new RSI([7]);
        //const mediumRSI: RSI = new RSI([25]);
        //const longRSI: RSI = new RSI([99]);

        // Initialize best suited candlestick interval
        const candlesticks: ICandlestick[] = this._candlestick.alterInterval(candlesticks1m, 30);
        
        // Iterate over each candlestick and calculate the indicators
        candlesticks.forEach((c) => {
            // Close Price
            const closePrice: number = <number>this._utils.outputNumber(c.c, {outputFormat: 'number'});

            // Populate the RSIs
            shortRSI.add(closePrice);
            //mediumRSI.add(closePrice);
            //longRSI.add(closePrice);
        });

        // Initialize the RSI values
        const sRSI: number = <number>this._utils.outputNumber(shortRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});
        //const mRSI: number = <number>this._utils.outputNumber(mediumRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});
        //const lRSI: number = <number>this._utils.outputNumber(longRSI.v(), {decimalPlaces: 0, outputFormat: 'number'});

        // Initialize the tendency
        let tendency: ITendencyForecast = 0;

       
        
        if (sRSI >= 75 && sRSI <= 85) {
            tendency = -1;
        }

        // If one of the RSIs is low, neutralize the short
        else if (sRSI <= 15 && sRSI <= 25) {
            tendency = 1;
        }

        // Log it
        if (tendency != 0) console.log(`SRSI (${sRSI})`);

        // Return the final results
        return {result: tendency};
    }
}