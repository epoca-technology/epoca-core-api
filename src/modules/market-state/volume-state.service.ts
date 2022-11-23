import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
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
     * Minimum Change
     * The minimum percentage change that must exist in the window in order for
     * it to have a state.
     */
     private readonly minChange: number = 10;




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
        const { upper_band, lower_band } = this._stateUtils.calculateBands(
            <number>this._utils.calculateMin(volumes), 
            <number>this._utils.calculateMax(volumes)
        );

        // Calculate the state
        const { state, state_value } = this._stateUtils.calculateState(
            volumes[0],
            volumes.at(-1),
            lower_band,
            upper_band,
            this.minChange
        );

        // Finally, return the state
        return {
            state: state,
            state_value: state_value,
            upper_band: upper_band,
            lower_band: lower_band,
            ts: Date.now(),
            volumes: volumes
        };
    }





    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns IWindowState
     */
    public getDefaultState(): IVolumeState {
        return {
            state: "stateless",
            state_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            volumes: []
        }
    }
}