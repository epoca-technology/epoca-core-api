import {inject, injectable} from "inversify";
import { SYMBOLS, ICandlestickSeries } from "../../../types";
import { IUtilitiesService } from "../utilities";
import { 
    IForecastResult, 
    IForecastService, 
    ITendencyForecast 
} from "./interfaces";





@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    constructor() {}






    /**
     * Given a series of candlesticks, it will predict the next position to be taken.
     * @param series 
     * @returns Promise<IForecastResult>
     */
    public async forecast(series: ICandlestickSeries): Promise<IForecastResult> {
        // Init the periods
        const periods: ICandlestickSeries[] = this.getSeriesPeriods(series);

        // Calculate the changed per period from beginning to end
        const changes: number[] = this.getPeriodChanges(periods);

        // Retrieve the tendency based on the periods
        let tendency: ITendencyForecast = this.getTendencyFromChanges(changes);

        // Return the final results
        return {result: tendency};
    }








    /**
     * Given a series of candlesticks, it will cut the list in different timeframes.
     * @param series 
     * @returns ICandlestickSeries[]
     */
    private getSeriesPeriods(series: ICandlestickSeries): ICandlestickSeries[] {
        return [
            series,
            series.slice(this._utils.alterNumberByPercentage(series.length, -95, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -90, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -80, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -70, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -60, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -50, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -40, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -30, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -20, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -10, 0, true)),
            series.slice(this._utils.alterNumberByPercentage(series.length, -5, 0, true)),
        ];
    }










    /**
     * Given a list of periods, it will calculate the change between the first series
     * item and the last within each period.
     * @param periods 
     * @returns number[]
     */
    private getPeriodChanges(periods: ICandlestickSeries[]): number[] { 
        let changes: number[] = [];
        for (let period of periods) {
            changes.push(this._utils.calculatePercentageChange(Number(period[0][4]), Number(period[period.length -1][4])));
        }
        return changes;
    }













    /**
     * Given a list of changes, it will classify each one and suggest the appropiate
     * tendency based on market conditions.
     * @param changes 
     * @returns ITendencyForecast
     */
     private getTendencyFromChanges(changes: number[]): ITendencyForecast {
        // Init the counters
        let long: number = 0;
        let short: number = 0;
        let neutral: number = 0;

        // Iterate over the changes and classify them
        for (let change of changes) {
            if (change > 0) { long += 1 }
            else if (change < 0) { short += 1 }
            else { neutral += 1 }
        }

        // Calculate the total amount of counters
        const total: number = long + short + neutral;

        // If the market is high, place a short
        if (this._utils.getPercentageOutOfTotal(long, total) >= 90) {
            return -1;
        }

        // If the market is low, place a long
        else if (this._utils.getPercentageOutOfTotal(short, total) >= 90) {
            return 1;
        }


        // Otherwise, stand neutral
        return 0;
    }




    

}