import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
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


    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultFullState();
    }






    /**
     * Calculates the volume state for the current window.
     * @param window 
     * @returns IStateType
     */
    public calculateState(window: ICandlestick[]): IStateType {
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
        const mean: number = <number>this._utils.outputNumber(accum / window.length);
        const meanHigh: number = <number>this._utils.calculateAverage([mean, highest]);

        // Calculate the state of the volume
        let state: IStateType = 0;
        const currentVolume: number = window.at(-1).v;
        if (currentVolume >= meanHigh) { state = 2 }
        else if (currentVolume >= mean) { state = 1 }

        /**
         * If the state is neutral, check if it is forming an increasing line. 
         * If so, assign it the increasing state.
         */
        if (
            state == 0 &&
            currentVolume > window.at(-2).v &&
            window.at(-2).v > window.at(-3).v
        ) {
            state = 1;
        }


        // Update the local state
        this.state = {
            s: state,
            m: mean,
            mh: meanHigh,
            w: items
        };

        // Finally, return the state
        return state;
    }











    /**
     * Retrieves the module's default state.
     * @returns IWindowState
     */
    private getDefaultFullState(): IVolumeState {
        return {
            s: 0,
            m: 0,
            mh: 0,
            w: []
        }
    }






    /**
     * Retrieves the module's default state.
     * @returns IStateType
     */
    public getDefaultState(): IStateType { return 0 }
}