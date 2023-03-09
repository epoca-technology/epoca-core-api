import {injectable, inject} from "inversify";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    ISplitStateResult,
    ISplitStates,
    ISplitStateSeriesItem,
    IStateType,
    IStateUtilitiesService,
} from "./interfaces";
import { ICandlestick } from "../candlestick";




@injectable()
export class StateUtilitiesService implements IStateUtilitiesService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    constructor() {}




    /**
     * Given a series of values, it will split them into groups and 
     * calculate the mean.
     * @param values 
     * @param groups 
     * @returns number[]
     */
    public buildAveragedGroups(values: number[], groups: number): number[] {
        // Init the grouped values
        let finalValues: number[] = [];

        // Calculate the steps in which the values will be grouped and processed
        const iterStep: number = Math.ceil(values.length / groups);

        // Iterate over the values, group them and then calculate the mean
        for (let i = 0; i < values.length; i = i + iterStep) {
            finalValues.push(<number>this._utils.calculateAverage(values.slice(i, i + iterStep)));
        }

        // Finally, return the values
        return finalValues;
    }












    /**
     * Calculates the current state for each split. Finally, calculates the
     * average state and returns it as well as the split states.
     * @param series 
     * @param requirement 
     * @param strongRequirement 
     * @returns { averageState: IStateType, splitStates: ISplitStates }
     */
    public calculateCurrentState(
        series: ICandlestick[]|ISplitStateSeriesItem[],
        requirement: number,
        strongRequirement: number
    ): { averageState: IStateType, splitStates: ISplitStates } {
        // Build the split states
        const states: ISplitStates = {
            s100: this.calculateSplitStateResult(series, requirement, strongRequirement),
            s75: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.75)), requirement, strongRequirement),
            s50: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.5)), requirement, strongRequirement),
            s25: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.25)), requirement, strongRequirement),
            s15: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.15)), requirement, strongRequirement),
            s10: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.10)), requirement, strongRequirement),
            s5: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.05)), requirement, strongRequirement),
            s2: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.02)), requirement, strongRequirement),
        }

        // Finally, return the average state and the split results
        return {
            averageState: this.calculateAverageState([
                states.s100.s,
                states.s75.s,
                states.s50.s,
                states.s25.s,
                states.s15.s,
                states.s10.s,
                states.s5.s,
                states.s2.s
            ]),
            splitStates: states
        }
    }




    /**
     * Calculates the state result for a given split.
     * @param series 
     * @param requirement 
     * @param strongRequirement 
     * @returns ISplitStateResult
     */
    private calculateSplitStateResult(
        series: ICandlestick[]|ISplitStateSeriesItem[]|any[],
        requirement: number,
        strongRequirement: number
    ): ISplitStateResult {
        // Initialize the first and last values
        let initial: number;
        let final: number;
        if (typeof series[0].y == "number") {
            initial = series[0].y;
            final = series.at(-1).y;
        } else {
            initial = series[0].c;
            final = series.at(-1).c;
        }

        // Calculate the change between the first and last values
        const change: number = <number>this._utils.calculatePercentageChange(initial, final);

        // Calculate the state
        let state: IStateType = 0;
        if      (change >= strongRequirement)       { state = 2 }
        else if (change >= requirement)             { state = 1 }
        else if (change <= -(strongRequirement))    { state = -2 }
        else if (change <= -(requirement))          { state = -1 }

        // Finally, return the result
        return { s: state, c: change }
    }








    /**
     * Given a list of states, it will determine the average and
     * return an unified result.
     * @param states
     * @returns IStateType
     */
    public calculateAverageState(states: IStateType[]): IStateType {
        // Calculate the sum of all the results
        const mean: BigNumber = <BigNumber>this._utils.calculateAverage(states, { of: "bn"});

        // Calculate the state and return it
        if (mean.isGreaterThanOrEqualTo(1.5))       { return 2 }
        else if (mean.isGreaterThanOrEqualTo(0.75)) { return 1 }
        else if (mean.isLessThanOrEqualTo(-1.5))    { return -2 }
        else if (mean.isLessThanOrEqualTo(-0.75))   { return -1 }
        else                                        { return 0 }
    }
}