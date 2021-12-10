import {appContainer} from "../../../ioc";
import { ICandlestickSeries, IVerbose, SYMBOLS } from "../../../types";
import * as tulind from "tulind";
import { 
    IMarketState, 
    ITulipData, 
    IMarketStateConfig, 
    IMovingAverages, 
    IMovingAveragesPoints, 
    IMovingAveragesPointsSummary,
    IRSISummary,
    IAroonSummary,
    IAroonPoints,
    IFOSCSummary,
    IFOSCPeriod
} from "./interfaces";
import { IForecastProviderResult, ITendencyForecast } from "../interfaces";
import {BigNumber} from "bignumber.js";


// Init Utilities Service
import { IUtilitiesService } from "../../../modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);



export class MarketState implements IMarketState {



    private readonly maPeriods: number[] = [5, 15, 25, 60, 100, 130, 160, 200];


    private readonly changePeriods: number[] = [1, 3, 5];


    private readonly forecastRequirement: number = 100;


    private readonly dust: number = 0.03;

    
    /**
     * @verbose
     * Displays additional data of the process for debugging purposes.
     * DEFAULT: 0
     */
     private readonly verbose: IVerbose = 1;
     




    constructor(config?: IMarketStateConfig) {

    }






    public async forecast(series: ICandlestickSeries): Promise<IForecastProviderResult> {
        // Initialize tulip data
        const data: ITulipData = this.buildTulipData(series);

        // Initialize the moving averages
        const mas: IMovingAverages = await this.buildMovingAverages(data.close);

        // Build the points summary
        const pointsSummary: IMovingAveragesPointsSummary = this.buildMovingAveragesPointsSummary(mas);

        // Initialize the tendency
        let tendency: ITendencyForecast = this.forecastTendencyByPointsSummary(pointsSummary);

        // Check the RSI if a tendency has been set
        let aroonSummary: IAroonSummary;
        let foscSummary: IFOSCSummary;
        let rsiSummary: IRSISummary;

        if (tendency != 0) {
            // Aroon

            // Build the summary
            aroonSummary = await this.buildAroonSummary(data.high, data.low);

            // Check if the tendency needs to be altered
            tendency = this.forecastTendencyByAroonSummary(tendency, aroonSummary);



            // RSI

            // Build the summary
            rsiSummary = await this.buildRSISummary(data.close);

            // Check if the tendency needs to be altered
            tendency = this.forecastTendencyByRSISummary(tendency, rsiSummary);


            // FOSC

            // Build the summary
            foscSummary = await this.buildFOSCSummary(data.close);

            // Check if the tendency needs to be altered
            tendency = this.forecastTendencyByFOSCSummary(tendency, foscSummary);
        }

        // Log it if applies
        if (this.verbose > 0 && tendency != 0) this.displayResult(tendency, pointsSummary, aroonSummary, foscSummary, rsiSummary);

        // Return the final tendency
        return {result: tendency};
    }







    /* Moving Averages */



    private async buildMovingAverages(close: number[]): Promise<IMovingAverages> {
        // Init value
        let mas: IMovingAverages = [];

        // Iterate over each ma period
        for (let period of this.maPeriods) { mas.push(await this.ema(close, period)) }

        // Return the array of mas
        return mas;
    }






    private buildMovingAveragesPointsSummary(mas: IMovingAverages): IMovingAveragesPointsSummary {
        // Init the final points
        let finalPoints: IMovingAveragesPoints = { long: 0, short: 0, neutral: 0};

        // Init the points by period
        let pointsByPeriod: IMovingAveragesPoints[] = [];

        // Iterate over each MA
        for (let ma of mas) {
            // Build the points
            const points: IMovingAveragesPoints = this.buildPointsForPeriod(ma);

            // Increment the points counter
            finalPoints.long += points.long;
            finalPoints.short += points.short;
            finalPoints.neutral += points.neutral;

            // Append the points to the period list
            pointsByPeriod.push(points);
        }

        // Return the points summary
        return {
            long: finalPoints.long,
            short: finalPoints.short,
            neutral: finalPoints.neutral,
            periods: pointsByPeriod,
        }
    }







    private buildPointsForPeriod(ma: number[]): IMovingAveragesPoints {
        // Init points
        let points: IMovingAveragesPoints = { long: 0, short: 0, neutral: 0};

        // Iterate over each change period and compare
        for (let cp of this.changePeriods) {
            // Calculate change
            const change: number = _utils.calculatePercentageChange(ma[ma.length - (1 + cp)], ma[ma.length - 1], 4);
            
            // Check the type of change
            if (change >= this.dust) { points.long += 1 }
            else if (change <= -(this.dust)) { points.short += 1 }
            else { points.neutral += 1 }
        }

        // return the points
        return points;
    }







    private forecastTendencyByPointsSummary(summary: IMovingAveragesPointsSummary): ITendencyForecast {
        // Calculate the total points
        const total: number = summary.long + summary.short + summary.neutral;

        // Calculate the dominance percentage for long and short
        const longPercentage: number = _utils.getPercentageOutOfTotal(summary.long, total);
        const shortPercentage: number = _utils.getPercentageOutOfTotal(summary.short, total);

        // Check if they meet the requirement
        if (longPercentage >= this.forecastRequirement) { return 1 }
        else if (shortPercentage >= this.forecastRequirement) { return -1 }
        else { return 0 }
    }







    /* Aroon */


    private async buildAroonSummary(high: number[], low: number[]): Promise<IAroonSummary> {
        // Init values
        let highAcum: number = 0;
        let lowAcum: number = 0;
        let pointsByPeriod: IAroonPoints[] = [];

        // Iterate over each MA period
        for (let period of this.maPeriods) {
            // Calculate Aroon
            const aroon: [number[], number[]] = await this.aroon(high, low, period);

            // Add values to the accumulators
            lowAcum += aroon[0][aroon[0].length - 1];
            highAcum += aroon[1][aroon[1].length - 1];

            // Record the period
            pointsByPeriod.push({
                low: aroon[0][aroon[0].length - 1],
                high: aroon[1][aroon[1].length - 1]
            });
        }

        // Calculate the total amount of points
        const total: number = highAcum + lowAcum;

        // Return the summary
        return {
            lowPercent: _utils.getPercentageOutOfTotal(lowAcum, total),
            highPercent: _utils.getPercentageOutOfTotal(highAcum, total),
            periods: pointsByPeriod
        }
    }




    private forecastTendencyByAroonSummary(tendency: ITendencyForecast, summary: IAroonSummary): ITendencyForecast {
        // Only long if it the high percent is dominating
        if (tendency == 1 && summary.highPercent < 40) {
            return 0;
        }
        // Only short if it the high percent is dominating
        else if (tendency == -1 && summary.lowPercent < 40) {
            return 0;
        }
        // Otherwise, maintain the position
        else {
            return tendency;
        }
    }







    /* FOSC */



    private async buildFOSCSummary(close: number[]): Promise<IFOSCSummary> {
        // Init the rsi data
        let periods: number[] = [];
        let longAcum: number = 0;
        let shortAcum: number = 0;

        // Iterate over each MA
        for (let period of this.maPeriods) {
            // Calculate the FOSC
            const fosc: number[] = await this.fosc(close, period);

            // Increment the counter accordingly
            if (fosc[fosc.length - 1] > 0) {
                longAcum += 1;
            }
            else if (fosc[fosc.length - 1] < 0) {
                shortAcum += 1;
            }

            // Add the current value to the list
            periods.push(fosc[fosc.length - 1]);
        }

        // Calculate the total count
        const total: number = longAcum + shortAcum;

        // Return the summary
        return {
            longPercentage: _utils.getPercentageOutOfTotal(longAcum, total),
            shortPercentage: _utils.getPercentageOutOfTotal(shortAcum, total),
            periods: periods
        }
    }

    



    private forecastTendencyByFOSCSummary(tendency: ITendencyForecast, summary: IFOSCSummary): ITendencyForecast {

        if (tendency == 1 && summary.longPercentage < 40) {
            return 0;
        }

        else if (tendency == -1 && summary.shortPercentage < 40) {
            return 0;
        }
        
        else {
            return tendency;
        }
    }











    /* RSI */


    private async buildRSISummary(close: number[]): Promise<IRSISummary> {
        // Init the rsi data
        let rsiPeriods: number[] = [];
        let overbought: boolean = false;
        let oversold: boolean = false;

        // Iterate over each MA
        for (let period of this.maPeriods) {
            // Calculate the RSI
            const rsi: number[] = await this.rsi(close, period);

            // Check if it is currently overbought
            if (rsi[rsi.length - 1] >= 85) {
                overbought = true;
            } 

            // Check if it is currently oversold
            else if (rsi[rsi.length - 1] <= 15) {
                oversold = true;
            }

            // Add the current value to the list
            rsiPeriods.push(rsi[rsi.length - 1]);
        }

        // Return the summary
        return {
            overbought: overbought,
            oversold: oversold,
            periods: rsiPeriods
        }
    }



    private forecastTendencyByRSISummary(tendency: ITendencyForecast, summary: IRSISummary): ITendencyForecast {

        if (tendency == 1 && summary.overbought) {
            return 0;
        }

        else if (tendency == -1 && summary.oversold) {
            return 0;
        }

        
        
        else {
            return tendency;
        }
    }





















    /* Indicators */






    /**
     * Exponential Moving Average
     * The exponential moving average, or exponential smoothing function, works by calculating each bar as a 
     * portion of the current input and a portion of the previous exponential moving average.
     * It takes one parameter, the period n, a positive integer. Larger values for n will have a greater 
     * smoothing effect on the input data but will also create more lag.
     * https://tulipindicators.org/ema
     * @param close 
     * @param period?  Defaults to 7
     * @returns Promise<number[]>
     */
     private async ema(close: number[], period?: number): Promise<number[]> {
        // Caclulate the EMA
        const ema: [number[]] = await tulind.indicators.ema.indicator([close], [
            typeof period == "number" ? period: 7
        ]);
        
        // Return the results
        return ema[0];
    }








    /**
     * Relative Strength Index
     * The Relative Strength Index is a momentum oscillator to help identify trends.
     * https://tulipindicators.org/rsi
     * @param close 
     * @param period? 
     * @returns Promise<number[]>
     */
    private async rsi(close: number[], period?: number): Promise<number[]> {
        // Caclulate the RSI
        const rsi: [number[]] = await tulind.indicators.rsi.indicator([close], [
            typeof period == "number" ? period: 5
        ]);

        // Return the results
        return rsi[0];
    }






     private async fosc(close: number[], period?: number): Promise<number[]> {
        // Caclulate the fosc
        const fosc: [number[]] = await tulind.indicators.fosc.indicator([close], [
            typeof period == "number" ? period: 5
        ]);

        // Return the results
        return fosc[0];
    }




    /**
     * Aroon Oscillator
     * The Aroon Oscillator indicator can help determine when the market is developing a trend.
     * https://tulipindicators.org/aroonosc
     * @param high 
     * @param low 
     * @param period? 
     * @returns Promise<number[]>
     */
    /*private async aroonosc(high: number[], low: number[], period?: number): Promise<number[]> {
        // Caclulate the aroonosc
        const aroonosc: [number[]] = await tulind.indicators.aroonosc.indicator([high, low], [
            typeof period == "number" ? period: 5
        ]);

        // Return the results
        return aroonosc[0];
    }*/







    private async aroon(high: number[], low: number[], period?: number): Promise<[number[], number[]]> {
        // Caclulate the aroonosc
        const aroon: [number[], number[]] = await tulind.indicators.aroon.indicator([high, low], [
            typeof period == "number" ? period: 5
        ]);
        
        // Return the results
        return aroon;
    }








    private async adx(high: number[], low: number[], close: number[], period?: number): Promise<number[]> {
       // Caclulate the adx
       const adx: [number[]] = await tulind.indicators.adx.indicator([high, low, close], [
           typeof period == "number" ? period: 5,
       ]);

       // Return the results
       return adx[0];
   }










    /**
     * Ultimate Oscillator
     * The Ultimate Oscillator is really a combination of three separate oscillators, each using a 
     * different smoothing period.
     * https://tulipindicators.org/stochrsi
     * @param high 
     * @param low 
     * @param close 
     * @param shortPeriod? 
     * @param mediumPeriod? 
     * @param longPeriod? 
     * @returns Promise<number[]>
     */
     private async ultosc(
         high: number[], 
         low: number[], 
         close: number[], 
         shortPeriod?: number,
         mediumPeriod?: number,
         longPeriod?: number,
    ): Promise<number[]> {
        // Caclulate the ultosc
        const ultosc: [number[]] = await tulind.indicators.ultosc.indicator([high, low, close], [
            typeof shortPeriod == "number" ? shortPeriod: 2,
            typeof mediumPeriod == "number" ? mediumPeriod: 3,
            typeof longPeriod == "number" ? longPeriod: 5,
        ]);

        // Return the results
        return ultosc[0];
    }














    /* Data Init */




    /**
     * Given a series of candlesticks, it will organize the data in the required format.
     * @param series 
     * @returns ISpanSeries
     */
     private buildTulipData(series: ICandlestickSeries): ITulipData {
        // Init the lists
        let spanSeries = {open: [],high: [],low: [],close: [],volume: []};

        // Iterate over the entire candlestick series and populate each property
        for (let item of series) {
            //spanSeries.open.push(Number(item[1]));
            spanSeries.high.push(Number(item[2]));
            spanSeries.low.push(Number(item[3]));
            spanSeries.close.push(Number(item[4]));
            //spanSeries.volume.push(Number(item[5]));
        }

        // Return the span series
        return spanSeries;
    }









    /* Verbose */



    /**
     * Displays the results including the final forecast
     * @param tendency
     * @param pSummary
     * @param aSummary
     * @param fSummary
     * @param rSummary
     * @returns void
     */
     private displayResult(
        tendency: ITendencyForecast,
        pSummary: IMovingAveragesPointsSummary,
        aSummary: IAroonSummary|undefined,
        fSummary: IFOSCSummary|undefined,
        rSummary: IRSISummary|undefined,
    ): void {
        console.log(' ');
        console.log(`Final: ${tendency} | L: ${pSummary.long} | S: ${pSummary.short} | N: ${pSummary.neutral} `);
        if (aSummary) {
            console.log(`Aroon Low: ${aSummary.lowPercent}% | Aroon High: ${aSummary.highPercent}%`);
            if (this.verbose > 1) console.log(aSummary.periods);
        }
        if (fSummary) {
            console.log(`FOSC Long: ${fSummary.longPercentage}% | FOSC Short: ${fSummary.shortPercentage}%`);
            if (this.verbose > 1) console.log(fSummary.periods);
        }
        if (rSummary) {
            console.log(`RSI Overbought: ${rSummary.overbought} | RSI Oversold: ${rSummary.oversold}`);
            if (this.verbose > 1) console.log(rSummary.periods);
        }
    }
}