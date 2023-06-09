import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../utilities";
import { 
    IVolumeState,
    IVolumeStateService,
    IVolumeStateIntensity
} from "./interfaces";




@injectable()
export class VolumeStateService implements IVolumeStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * The requirements for the volume to have a state. They are
     * recalculated every hour.
     */
    private mean: number;
    private meanMedium: number;
    private meanHigh: number;
    private nextRequirementCalculation: number;



    /**
     * State
     * The full volume state. Used to derive the minified state.
     */
    public state: IVolumeState;
    public statefulUntil: number;


    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultFullState();
    }






    /**
     * Calculates the volume state for the current window.
     * @returns IVolumeStateIntensity
     */
    public calculateState(): IVolumeStateIntensity {
        // Make sure the candlesticks lookback has been initialized
        if (this._candlestick.lookback.length) {
            // Init the current candlestick
            const current: ICandlestick = this._candlestick.lookback.at(-1);

            // Check if the requirements need to be recalculated
            if (!this.mean || !this.nextRequirementCalculation || current.ot >= this.nextRequirementCalculation) {
                // Iterate over each candlestick, accumulate its values and identify the highest
                let accum: number = 0;
                let highest: number = 0;
                for (let c of this._candlestick.lookback) {
                    accum += c.v;
                    if (c.v > highest) highest = c.v; 
                }

                // Calculate the mean and the mean high values
                this.mean = <number>this._utils.outputNumber(accum / this._candlestick.lookback.length);
                const meanHigh: number = <number>this._utils.calculateAverage([this.mean, highest]);
                this.meanHigh = <number>this._utils.calculateAverage([this.mean, meanHigh]);
                this.meanMedium = <number>this._utils.calculateAverage([this.mean, this.meanHigh]);

                // Set the next calculation time
                this.nextRequirementCalculation = moment().add(1, "hour").valueOf();
            }

            // Calculate the state of the volume
            let state: IVolumeStateIntensity = 0;
            if      (current.v >= this.meanHigh)    { state = 3 }
            else if (current.v >= this.meanMedium)  { state = 2 }
            else if (current.v >= this.mean)        { state = 1 }

            // If it is stateful, set the timer
            if (state > 0) {
                // If the state was increasing strongly, preserve it
                state = state > this.state.s ? state: this.state.s;

                // Activate the stateful timer
                this.statefulUntil = moment().add(5, "minutes").valueOf();
            }

            // If there is no longer a state, check if the previous one should be preserved
            else if (this.state.s > 0 && this.statefulUntil && Date.now() <= this.statefulUntil){
                state = this.state.s;
            }

            // Update the local state
            this.state = {
                s: state,
                m: this.mean,
                mm: this.meanMedium,
                mh: this.meanHigh,
                v: current.v
            };

            // Finally, return the state
            return state;
        }

        // Otherwise, set and return the default state
        else {
            this.state = this.getDefaultFullState();
            return 0;
        }
    }











    /**
     * Retrieves the module's default state.
     * @returns IWindowState
     */
    private getDefaultFullState(): IVolumeState {
        return {
            s: 0,
            m: 0,
            mm: 0,
            mh: 0,
            v: 0
        }
    }






    /**
     * Retrieves the module's default state.
     * @returns IVolumeStateIntensity
     */
    public getDefaultState(): IVolumeStateIntensity { return 0 }
}