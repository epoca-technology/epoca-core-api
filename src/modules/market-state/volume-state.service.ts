import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IMinifiedVolumeState,
    ISplitStateSeriesItem,
    IStateType,
    IVolumeState,
    IVolumeStateService,
} from "./interfaces";




@injectable()
export class VolumeStateService implements IVolumeStateService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * State
     * The full volume state. Used to derive the minified state.
     */
    public state: IVolumeState;



    /**
     * Direction Requirements
     * The percent a side (bull/bear) must represent in order for the volume to
     * have a direction.
     */
    private readonly windowDirectionWidth: number = 16;
    private readonly directionRequirement: number = 51;
    private readonly strongDirectionRequirement: number = 55;


    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultFullState();
    }






    /**
     * Calculates the volume state for the current window.
     * @param window 
     * @returns IMinifiedVolumeState
     */
    public calculateState(window: ICandlestick[]): IMinifiedVolumeState {
        // Build the series as well as the volume accumulation
        let items: ISplitStateSeriesItem[] = [];
        let accum: number = 0;
        let highest: number = 0;
        for (let c of window) {
            items.push({x: c.ot, y: c.v});
            accum += c.v;
            if (c.v > highest) highest = c.v; 
        }

        // Calculate the mean and the mean high values
        const mean: number = accum / window.length;
        const meanHigh: number = <number>this._utils.calculateAverage([mean, highest]);

        // Calculate the state of the volume
        let state: IStateType = 0;
        const currentVolume: number = window.at(-1).v;
        if (currentVolume >= meanHigh) { state = 2 }
        else if (currentVolume >= mean) { state = 1 }

        // Calculate the direction
        const { direction, direction_value } = this.calculateDirection(window);

        // Update the local state
        this.state = {
            s: state,
            m: mean,
            mh: meanHigh,
            d: direction,
            dv: direction_value,
            w: items
        };

        // Finally, return the minified state
        return { s: state, d: direction };
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
    private getDefaultFullState(): IVolumeState {
        return {
            s: 0,
            m: 0,
            mh: 0,
            d: 0,
            dv: 0,
            w: []
        }
    }






    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns IWindowState
     */
    public getDefaultState(): IMinifiedVolumeState {
        return { s: 0, d: 0 }
    }
}