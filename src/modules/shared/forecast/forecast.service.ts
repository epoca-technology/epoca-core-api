import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { ICandlestick } from "../candlestick";
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



    private readonly dustAmount: number = 0.7;


    constructor() {}






    /**
     * Given a series of candlesticks, it will predict the next position to be taken.
     * @param series 
     * @returns Promise<IForecastResult>
     */
    public async forecast(series: ICandlestick[]): Promise<IForecastResult> {
        // Init the periods
        const periods: ICandlestick[][] = this.getSeriesPeriods(series);

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
     private getSeriesPeriods(series: ICandlestick[]): ICandlestick[][] {
        // Initialize the series list
        let list: ICandlestick[][] = [series];

        // Build the smaller frames
        for (let i = -95; i <= -5; i = i + 5) {
            list.push(series.slice(<number>this._utils.alterNumberByPercentage(series.length, i, {
                decimalPlaces: 0, 
                roundUp: true, 
                outputFormat: "number"
            })));
        }
        
        // Return the final list
        return list;
    }










    /**
     * Given a list of periods, it will calculate the change between the first series
     * item and the last within each period.
     * @param periods 
     * @returns number[]
     */
    private getPeriodChanges(periods: ICandlestick[][]): number[] { 
        let changes: number[] = [];
        for (let period of periods) {
            changes.push(<number>this._utils.calculatePercentageChange(period[0].c, period[period.length -1].c, {
                outputFormat: 'number'
            }));
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
        let up: number = 0;
        let down: number = 0;
        let neutral: number = 0;

        // Iterate over the changes and classify them
        for (let change of changes) {
            if (change > this.dustAmount) { up += 1 }
            else if (change < -(this.dustAmount)) { down += 1 }
            else { neutral += 1 }
        }

        // Calculate the total amount of counters
        const total: number = up + down + neutral;

        // Initialize the tendency
        let tendency: ITendencyForecast = 0;

        // If the market is high, place a short
        if (
            this._utils.calculatePercentageOutOfTotal(up, total) >= 95 &&
            changes[changes.length -1] >= changes[changes.length - 2] &&
            changes[changes.length -2] >= changes[changes.length - 3] &&
            changes[changes.length -3] >= changes[changes.length - 4] &&
            changes[changes.length -4] >= changes[changes.length - 5]
        ) {
            return -1;
        }

        // If the market is low, place a long
        else if (
            this._utils.calculatePercentageOutOfTotal(down, total) >= 95 &&
            changes[changes.length -1] <= changes[changes.length - 2] &&
            changes[changes.length -2] <= changes[changes.length - 3] &&
            changes[changes.length -3] <= changes[changes.length - 4] &&
            changes[changes.length -4] <= changes[changes.length - 5]
        ) {
            return 1;
        }


        // Return the final tendency
        return tendency;
    }




    

}