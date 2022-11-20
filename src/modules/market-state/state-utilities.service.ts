import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    IStateBand,
    IStateType,
    IStateUtilitiesService,
} from "./interfaces";




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
     * Calculates the upper and lower bands based on the highest and lowest
     * values within the sequence.
     * @param minVal 
     * @param maxVal 
     * @returns {upper_band: IStateBand, lower_band: IStateBand}
     */
    public calculateBands(minVal: number, maxVal: number): {upper_band: IStateBand, lower_band: IStateBand} {
        // Init the bands' ends
        const upperBandEnd: number = maxVal;
        const lowerBandEnd: number = minVal;

        // Calculate the windows middle
        const windowMiddle: number = <number>this._utils.calculateAverage([upperBandEnd, lowerBandEnd]);

        // Calculate the start of the upper and lower bands
        const upperBandStart: number = <number>this._utils.calculateAverage([windowMiddle, upperBandEnd]);
        const lowerBandStart: number = <number>this._utils.calculateAverage([windowMiddle, lowerBandEnd]);

        // Finally, pack the bands and return then
        return { 
            upper_band: {start: upperBandStart, end: upperBandEnd}, 
            lower_band: {start: lowerBandStart, end: lowerBandEnd} 
        }
    }








    /**
     * Calculates the current state of a module based on the provided params.
     * @param initialValue 
     * @param lastValue 
     * @param lowerBand 
     * @param upperBand 
     * @param minChange 
     * @returns { state: IStateType, state_value: number }
     */
    public calculateState(
        initialValue: number, 
        lastValue: number, 
        lowerBand: IStateBand, 
        upperBand: IStateBand,
        minChange: number
    ): { state: IStateType, state_value: number } { 
        // Init values
        let state: IStateType = "stateless";
        const stateValue: number = <number>this._utils.calculatePercentageChange(initialValue, lastValue);

        // Check if it is an increasing state
        if (stateValue >= minChange && lastValue >= upperBand.start) { state = "increasing" }

        // Check if it is a decreasing state
        else if (stateValue <= -(minChange) && lastValue <= lowerBand.start) { state = "decreasing" }

        // Finally, pack and return the results
        return { state: state, state_value: stateValue }
    }
}