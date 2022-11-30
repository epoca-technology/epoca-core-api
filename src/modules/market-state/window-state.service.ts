import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IStateBandsResult,
    IStateUtilitiesService,
    IWindowState,
    IWindowStateService,
} from "./interfaces";




@injectable()
export class WindowStateService implements IWindowStateService {
    // Inject dependencies
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Minimum Change
     * The minimum percentage change that must exist in the window in order for
     * it to have a state.
     */
    private readonly minChange: number = 1.5;



    constructor() { }






    /**
     * Calculates the state for the current window.
     * @param window 
     * @returns IWindowState
     */
    public calculateState(window: ICandlestick[]): IWindowState {
        // Build the high and low lists in order to calculate min and max
        let high: number[] = [];
        let low: number[] = [];
        for (let candlestick of window) {
            high.push(candlestick.h);
            low.push(candlestick.l);
        }

        // Calculate the window bands
        const bands: IStateBandsResult = this._stateUtils.calculateBands(
            <number>this._utils.calculateMin(low), 
            <number>this._utils.calculateMax(high)
        );

        // Calculate the state
        const { state, state_value } = this._stateUtils.calculateState(
            window[0].o,
            window.at(-1).c,
            bands,
            this.minChange
        );

        // Finally, return the state
        return {
            state: state,
            state_value: state_value,
            upper_band: bands.upper_band,
            lower_band: bands.lower_band,
            ts: Date.now(),
            window: window
        };
    }








    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns IWindowState
     */
    public getDefaultState(): IWindowState {
        return {
            state: "stateless",
            state_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            window: []
        }
    }
}