import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IStateBandsResult,
    IStateType,
    IStateUtilitiesService,
    IVolumeState,
    IVolumeStateService,
} from "./interfaces";




@injectable()
export class VolumeStateService implements IVolumeStateService {
    // Inject dependencies
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Groups
     * The number of groups that will be built.
     */
    private readonly groups: number = 16;
    


    /**
     * Window Change
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly minChange: number = 20;
    private readonly strongChange: number = 70;



    /**
     * Direction Requirements
     * The percent a side (bull/bear) must represent in order for the volume to
     * have a direction.
     */
    private readonly windowDirectionWidth: number = 20;
    private readonly directionRequirement: number = 51;
    private readonly strongDirectionRequirement: number = 55;


    constructor() {}






    /**
     * Calculates the state for the current window.
     * @param window 
     * @returns IVolumeState
     */
    public calculateState(window: ICandlestick[]): IVolumeState {
        // Build the averaged list of volumes
        //const volumes: number[] = this._stateUtils.buildAveragedGroups(window.map(c => c.v), this.groups);
        const volumes: number[] = window.map(c => c.v);

        // Calculate the window bands
        const bands: IStateBandsResult = this._stateUtils.calculateBands(
            <number>this._utils.calculateMin(volumes), 
            <number>this._utils.calculateMax(volumes)
        );

        // Calculate the state
        let { state, state_value } = this._stateUtils.calculateState(
            volumes[0],
            volumes.at(-1),
            bands,
            this.minChange,
            this.strongChange
        );

        /**
         * When a new candlestick comes into existance, it is possible for the volume state
         * to become -1 or -2 since the data is brand new and not enough trades have been
         * recorded. Therefore, in order for the volume to have a decreasing state (-1 or -2),
         * the last 2 records must be forming a declining line. Otherwise, the decreasing state
         * will be neutralized (set to 0).
         */
        if (
            state < 0 &&
            (volumes.at(-1) > volumes.at(-2) || volumes.at(-2) > volumes.at(-3))
        ) {
            state = 0;
        }

        // Calculate the direction
        const { direction, direction_value } = this.calculateDirection(window);

        // Finally, return the state
        return {
            state: state,
            state_value: state_value,
            direction: direction,
            direction_value: direction_value,
            upper_band: bands.upper_band,
            lower_band: bands.lower_band,
            ts: Date.now(),
            volumes: volumes
        };
    }




    /**
     * Based on a given list of candlesticks, it will calculate
     * the price direction based on the volume within the window.
     * @param window 
     * @returns { direction: IStateType, direction_value: number}
     */
    private calculateDirection(window: ICandlestick[]): { direction: IStateType, direction_value: number} {
        // Adjust the window according to the split
        const adjWindow: ICandlestick[] = window.slice(-(this.windowDirectionWidth));

        // Init the volume accumulators
        let bullVol: number = 0;
        let bearVol: number = 0;
        let vol: number = 0;

        /**
         * Iterate over each candlestick in the window and accumulate
         * the volumes according to the candlestick's outcome.
         * open < close = Bull
         * open > close = Bear
         */
        for (let candlestick of adjWindow) {
            if      (candlestick.o < candlestick.c) { bullVol += candlestick.v }
            else if (candlestick.o > candlestick.c) { bearVol += candlestick.v }
            vol += candlestick.v;
        }

        // Calculate the percent each side represents
        const bull: number = <number>this._utils.calculatePercentageOutOfTotal(bullVol, vol);
        const bear: number = <number>this._utils.calculatePercentageOutOfTotal(bearVol, vol);

        // Evaluate a possible bull direction
        if      (bull >= this.strongDirectionRequirement)   { return { direction: 2, direction_value: bull } }
        else if (bull >= this.directionRequirement)         { return { direction: 1, direction_value: bull } }

        // Evaluate a possible bear direction
        else if (bear >= this.strongDirectionRequirement)   { return { direction: -2, direction_value: bear } }
        else if (bear >= this.directionRequirement)         { return { direction: -1, direction_value: bear } }

        // Otherwise, there is no direction
        else                                                { return { direction: 0, direction_value: 0 } }
    }








    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns IWindowState
     */
    public getDefaultState(): IVolumeState {
        return {
            state: 0,
            state_value: 0,
            direction: 0,
            direction_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            volumes: []
        }
    }
}