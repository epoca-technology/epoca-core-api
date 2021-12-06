import {appContainer} from "../../../ioc";
import { ICandlestickSeries, IVerbose, SYMBOLS } from "../../../types";
import { ITendencyForecast, ITendencyForecastExtended, IForecastProviderResult, IIntensity } from "../interfaces";
import { 
    ITulip, 
    ITulipConfig, 
    ISpanSeries, 
    ISpan, 
    IMAPeriods,
    ISpanMA,
    IMAOutcome,
    IMASpanOutcomes,
    IMAResult,
    ISpanImportance,
    IPoints
} from "./interfaces";
import * as tulind from "tulind";
import {BigNumber} from "bignumber.js";



// Init Utilities Service
import { IUtilitiesService } from "../../../modules/shared/utilities";
import { ISpanName } from ".";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




export class Tulip implements ITulip {
    /**
     * @series
     * This object contains the formated series for each of the time spans.
     * It is recommended to initialize this class with 720 hourly candlesticks.
     */
    private readonly series: ISpan;


    
    /**
     * @spanImportance
     * Assigns importance to each spans when it comes down to analyzing final results.
     * The bigger the number, the more points it will add to the total
     */
    private readonly spanImportance: ISpanImportance = {
        oneMonth: 1,
        twoWeeks: 1,
        oneWeek: 2,
        threeDays: 8,
    }



    /**
     * @maPeriods
     * These are the periods that will be used to calculate the SMA & EMA.
     * DEFAULT: MA1: 7, MA2: 20, MA3: 70
     */
    private readonly maPeriods: IMAPeriods = {
        MA1: 7,
        MA2: 20,
        MA3: 70
    }



    /**
     * @maDust
     * For a change to issue a forecast, the % change must be greater than the dust
     * amount. Otherwise it falls into the neutral area.
     * DEFAULT: 2%
     */
    private readonly maDust: number = 1;




    
    /**
     * @verbose
     * Displays additional data of the process for debugging purposes.
     * DEFAULT: 0
     */
     private readonly verbose: IVerbose = 0;

    






    constructor(series: ICandlestickSeries, config: ITulipConfig) {
        //console.log(series.length);
        // Make sure the series is valid
        if (series.length < 715 || series.length > 730) {
            throw new Error('The series must contain between 715 and 730 candlesticks.');
        }; 

        // Init the series
        this.series = this.getSpanSeries(series);

        // Init the Span Importance if provided
        if (config.spanImportance) this.spanImportance = config.spanImportance;

        // Init the MA Periods if provided
        if (config.maPeriods) this.maPeriods = config.maPeriods;

        // Set the MA Dust if provided
        if (typeof config.maDust == "number") this.maDust = config.maDust; 

        // Set Verbosity
        if (typeof config.verbose == "number") this.verbose = config.verbose;
    }
    







    

    public async forecast(): Promise<IForecastProviderResult> {


        const maForecast: IMAResult = await this.getMAForecast(true);
        return {result: maForecast.tendency};
    }









    /**
     * Retrieves the MA Forecast, as well as the data that was use to determine it
     * @param ema 
     * @returns Promise<IMAResult>
     */
    private async getMAForecast(ema?: boolean): Promise<IMAResult> {
        // Retrieve all span MAs
        const spanMAs: [ISpanMA, ISpanMA, ISpanMA, ISpanMA] = await Promise.all([
            this.getSpanMA(this.series.oneMonth.close, ema),
            this.getSpanMA(this.series.twoWeeks.close, ema),
            this.getSpanMA(this.series.oneWeek.close, ema),
            this.getSpanMA(this.series.threeDays.close, ema)
        ]);

        // Retrive the results
        return this.getMAResult([
            this.getMAOutcomes(spanMAs[0]),
            this.getMAOutcomes(spanMAs[1]),
            this.getMAOutcomes(spanMAs[2]),
            this.getMAOutcomes(spanMAs[3]),
        ]);
    }









    /**
     * Given a span of prices, it will calculate the sma|ema for each configuration period.
     * @param close 
     * @param ema? 
     * @returns Promise<ISpanMA>
     */
    private async getSpanMA(close: number[], ema?: boolean): Promise<ISpanMA> {
        return {
            ma1: ema ? await this.ema(close, this.maPeriods.MA1): await this.sma(close, this.maPeriods.MA1),
            ma2: ema ? await this.ema(close, this.maPeriods.MA2): await this.sma(close, this.maPeriods.MA2),
            ma3: ema ? await this.ema(close, this.maPeriods.MA3): await this.sma(close, this.maPeriods.MA3)
        }
    }








    /**
     * Given a full span ma, it will retrieve the outcome for each period.
     * @param ma 
     * @returns IMASpanOutcomes
     */
    private getMAOutcomes(ma: ISpanMA): IMASpanOutcomes {
        return {
            MA1: this.getMAOutcome(ma.ma1),
            MA2: this.getMAOutcome(ma.ma2),
            MA3: this.getMAOutcome(ma.ma3)
        }
    }










    /**
     * Given the ma results, it will determine what trend has been taken as well as the intensity.
     * @param maList 
     * @returns 
     */
    private getMAOutcome(maList: number[]): IMAOutcome{
        // Calculate the change between the first and the last item
        const change: number = _utils.calculatePercentageChange(maList[0], maList[maList.length - 1]);

        /* Handle the change accordingly */

        // Short
        if (change <= -15) { return { tendency: -1, intensity: 2} }
        else if (change > -15 && change <= -(this.maDust)) { return { tendency: -1, intensity: 1} }

        // Neutral
        else if (change >= -(this.maDust) && change <= this.maDust) { return { tendency: 0, intensity: 1} }

        // Long
        else if (change > this.maDust && change < 15) { return { tendency: 1, intensity: 1} }
        else { return { tendency: 1, intensity: 2} }
    }










    /**
     * Given the MA Span Outcomes, it will analyze the data for each span and return a 
     * final result.
     * @param outcomes 
     * @returns IMAResult
     */
    private getMAResult(outcomes: IMASpanOutcomes[]): IMAResult {
        // Calculate the accumulated points & tendency by span
        let spanPoints: IPoints[] = [];
        let spanTendencies: ITendencyForecast[] = [];
        for (let i = 0; i < 4; i++) {
            // Calculate the points
            spanPoints.push(this.getSpanTotalPoints(outcomes[i], i));

            // Retrieve the tendency
            spanTendencies.push(this.getTendencyByPoints(spanPoints[i]))
        }

        // Calculate the total amount of points
        const totalPoints: IPoints = this.getTotalPoints(spanPoints);

        // Retrieve the final tendency
        const tendency: ITendencyForecast = this.getTendencyByPoints(totalPoints);

        // Log it if applies
        if (this.verbose > 0) this.displayMAResult(spanPoints, spanTendencies, totalPoints, tendency);

        // Return the result
        return {
            tendency: tendency,
            oneMonth: { tendency: spanTendencies[0], points: spanPoints[0]},
            twoWeeks: { tendency: spanTendencies[1], points: spanPoints[1]},
            oneWeek: { tendency: spanTendencies[2], points: spanPoints[2]},
            threeDays: { tendency: spanTendencies[3], points: spanPoints[3]},
        }
    }







    /**
     * Given the MA Outcomes for a span, it will totalize the points for long, short and
     * neutral.
     * @param maOutcomes 
     * @param spanIndex 
     * @returns IPoints
     */
    private getSpanTotalPoints(maOutcomes: IMASpanOutcomes, spanIndex: number): IPoints {
        // Init counters
        let long: number = 0;
        let short: number = 0;
        let neutral: number = 0;

        // Init the importance
        const importance: number = this.getSpanImportanceByIndex(spanIndex);

        // Iterate over each MA and populate the conters
        for (let maKey in maOutcomes) {
            switch (maOutcomes[maKey].tendency) {
                case 0:
                    neutral += maOutcomes[maKey].intensity * importance;
                    break;
                case 1:
                    long += maOutcomes[maKey].intensity * importance;
                    break;
                case -1:
                    short += maOutcomes[maKey].intensity * importance;
                    break;
            }
        }

        // Return the points
        return {
            long: long,
            short: short,
            neutral: neutral
        }
    }





    /**
     * Given a list of points collected by span, it return a totalized object.
     * @param allPoints 
     * @returns IPoints
     */
    private getTotalPoints(allPoints: IPoints[]): IPoints {
        // Init counters
        let long: number = 0;
        let short: number = 0;
        let neutral: number = 0;

        // Iterate over all the collected points and populate results
        for (let p of allPoints) {
            long += p.long;
            short += p.short;
            neutral += p.neutral;
        }

        // Return the total points
        return {
            long: long,
            short: short,
            neutral: neutral
        }
    }










    /**
     * Given a points object, it will retrieve the tendency forecast.
     * @param points 
     * @returns ITendencyForecast
     */
    private getTendencyByPoints(points: IPoints): ITendencyForecast {
        // Calculate the total amount of points
        const totalPoints: number = points.long + points.short + points.neutral;

        // To be a long, it needs to account for over 50% of the total points
        if (_utils.getPercentageOutOfTotal(points.long, totalPoints) > 50) {
            return 1
        }
        // To be a short, it needs to account for over 50% of the total points
        else if (_utils.getPercentageOutOfTotal(points.short, totalPoints) > 50) {
            return -1
        }
        // Otherwise, stand neutral
        else {
            return 0;
        }
    }
















    /* Span Getters */







    /**
     * Given a span index, it will retrieve the importance.
     * @param index 
     * @returns number
     */
    private getSpanImportanceByIndex(index: number): number {
        switch (index) {
            case 0:
                return this.spanImportance.oneMonth;
            case 1:
                return this.spanImportance.twoWeeks;
            case 2:
                return this.spanImportance.oneWeek;
            default: // 3
                return this.spanImportance.threeDays;
        }
    }








    /**
     * Retrieves the span name by index.
     * @param index 
     * @returns ISpanName
     */
    private getSpanNameByIndex(index: number): ISpanName {
        switch(index) {
            case 0:
                return 'oneMonth';
            case 1:
                return 'twoWeeks';
            case 2:
                return 'oneWeek';
            case 3:
                return 'threeDays';
        }
    }














    /* Indicators */





    /**
     * Simple Moving Average
     * The Simple Moving Average is one of the most common smoothing functions used on time series data.
     * It takes one parameter, the period n. Larger values for n will have a greater smoothing effect on 
     * the input data but will also create more lag.
     * It is calculated for each bar as the arithmetic mean of the previous n bars.
     * https://tulipindicators.org/sma
     * @param close 
     * @param period? Defaults to 7
     * @returns Promise<number[]>
     */
    private async sma(close: number[], period?: number): Promise<number[]> {
        // Caclulate the SMA
        const sma: [number[]] = await tulind.indicators.sma.indicator([close], [
            typeof period == "number" ? period: 7
        ]);

        // Return the results
        return sma[0];
    }

    






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















    





    /* Initialization Helpers */








    /**
     * Given a candlestick series, it will build the series for all time spans.
     * @param series 
     * @returns 
     */
    private getSpanSeries(series: ICandlestickSeries): ISpan {
        return {
            oneMonth: this.getSpanSeriesFromCandlesticks(series),
            twoWeeks: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 360)),
            oneWeek: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 168)),
            threeDays: this.getSpanSeriesFromCandlesticks(series.slice(series.length - 72)),
        }
    }



    








    /**
     * Given a series of candlesticks, it will organize the data in the required format.
     * @param series 
     * @returns ISpanSeries
     */
    private getSpanSeriesFromCandlesticks(series: ICandlestickSeries): ISpanSeries {
        // Init the lists
        let spanSeries: ISpanSeries = {open: [],high: [],low: [],close: [],volume: []};

        // Iterate over the entire candlestick series and populate each property
        for (let item of series) {
            //spanSeries.open.push(Number(item[1]));
            //spanSeries.high.push(Number(item[2]));
            //spanSeries.low.push(Number(item[3]));
            spanSeries.close.push(Number(item[4]));
            //spanSeries.volume.push(Number(item[5]));
        }

        // Return the span series
        return spanSeries;
    }

    








    /* Verbose */







    /**
     * Displays an MA result inclusing the final decision.
     * @param points 
     * @param tendencies 
     * @param totalPoints 
     * @param finalTendency 
     * @returns void
     */
    private displayMAResult(
        points: IPoints[], 
        tendencies: ITendencyForecast[], 
        totalPoints: IPoints, 
        finalTendency: ITendencyForecast
    ): void {
        console.log(' ');
        console.log(`Final: ${finalTendency} | L: ${totalPoints.long} | S: ${totalPoints.short} | N: ${totalPoints.neutral} `);
        if (this.verbose > 1) {
            for (let i = 0; i < 4; i++) {
                console.log(`${this.getSpanNameByIndex(i)}: ${tendencies[i]} | L: ${points[i].long} | S: ${points[i].short} | N: ${points[i].neutral} `);
            }
        }
        console.log(' ');
    }
















    /* Test Helpers */







    /**
     * Checks if 2 values are close enough to be considered a match.
     * @param value1 
     * @param value2 
     * @param allowedDifference? 
     * @returns boolean
     */
     public isCloseEnough(value1: number, value2: number, allowedDifference?: number): boolean {
        // Calculate the difference between the 2 values
        const difference: number = value1 - value2;

        // Init the allowed difference
        allowedDifference = typeof allowedDifference == "number" ? allowedDifference: 0.02;

        // Check if the difference is within the allowed range
        return difference <= allowedDifference && difference >= -(allowedDifference);
    }
}