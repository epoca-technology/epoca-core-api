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
    private readonly groups: number = 10;
    


    /**
     * Window Change
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly minChange: number = 15;
    private readonly strongChange: number = 50;



    /**
     * Direction Requirements
     * The percent a side (bull/bear) must represent in order for the volume to
     * have a direction.
     */
    private readonly directionRequirement: number = 51;
    private readonly strongDirectionRequirement: number = 60;


    constructor() {}






    /**
     * Calculates the state for the current window.
     * @param window 
     * @returns IVolumeState
     */
    public calculateState(window: ICandlestick[]): IVolumeState {
        // Build the averaged list of volumes
        const volumes: number[] = this._stateUtils.buildAveragedGroups(window.map(c => c.v), this.groups);

        // Calculate the window bands
        const bands: IStateBandsResult = this._stateUtils.calculateBands(
            <number>this._utils.calculateMin(volumes), 
            <number>this._utils.calculateMax(volumes)
        );

        // Calculate the state
        const { state, state_value } = this._stateUtils.calculateState(
            volumes[0],
            volumes.at(-1),
            bands,
            this.minChange,
            this.strongChange
        );

        // Calculate the direction
        const direction: IStateType = this.calculateDirection(window);

        // Finally, return the state
        return {
            state: state,
            state_value: state_value,
            direction: direction,
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
     * @returns IStateType
     */
    private calculateDirection(window: ICandlestick[]): IStateType {
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
        for (let candlestick of window) {
            if      (candlestick.o < candlestick.c) { bullVol += candlestick.v }
            else if (candlestick.o > candlestick.c) { bearVol += candlestick.v }
            vol += candlestick.v;
        }

        // Calculate the percent each side represents
        const bull: number = <number>this._utils.calculatePercentageOutOfTotal(bullVol, vol);
        const bear: number = <number>this._utils.calculatePercentageOutOfTotal(bearVol, vol);

        // Evaluate a possible bull direction
        if      (bull >= this.strongDirectionRequirement)   { return 2 }
        else if (bull >= this.directionRequirement)         { return 1 }

        // Evaluate a possible bear direction
        else if (bear >= this.strongDirectionRequirement)   { return -2 }
        else if (bear >= this.directionRequirement)         { return -1 }

        // Otherwise, there is no direction
        else                                                { return 0 }
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
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            volumes: []
        }
    }
}