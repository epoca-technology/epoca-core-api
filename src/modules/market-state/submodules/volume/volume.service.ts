import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../../../ioc";
import { ICandlestick, ICandlestickService } from "../../../candlestick";
import { IUtilitiesService } from "../../../utilities";
import { 
    IVolumeState,
    IVolumeService,
    IVolumeStateIntensity,
    IVolumeModel,
    IVolumeValidations,
    IVolumeStateRequirements
} from "./interfaces";




@injectable()
export class VolumeService implements IVolumeService {
    // Inject dependencies
    @inject(SYMBOLS.VolumeModel)                 private _model: IVolumeModel;
    @inject(SYMBOLS.VolumeValidations)           private _validations: IVolumeValidations;
    @inject(SYMBOLS.CandlestickService)          private _candlestick: ICandlestickService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;

    /**
     * Volume State Requirements
     * For the volume to have a state, the current 1m candlestick's volume must meet the requirements
     * which are calculated every hour.
     */
    private requirements: IVolumeStateRequirements;



    /**
     * State
     * The full volume state. Used to derive the minified state.
     */
    public state: IVolumeState;
    private readonly stateDurationMinutes: number = 3;
    public statefulUntil?: number;


    constructor() {}

    @postConstruct()
    public onInit(): void {
        // Initialize the default requirements
        this.requirements = this.getDefaultRequirements();

        // Initialize the default state
        this.state = this.getDefaultFullState();
    }







    /*********************
     * State Calculation *
     *********************/




    /**
     * Calculates the volume state for the current window.
     * @returns IVolumeStateIntensity
     */
    public calculateState(): IVolumeStateIntensity {
        // Init the current candlestick
        const current: ICandlestick = this._candlestick.lookback.at(-1);

        // Check if the requirements need to be recalculated
        if (current.ot >= this.requirements.nextRequirementCalculation) {
            this.requirements = this.calculateRequirements();
        }

        // Calculate the state of the volume
        let state: IVolumeStateIntensity = this.calculateStateIntensity(current.v, this.requirements);

        // If it is stateful, set the timer
        if (state > 0) {
            // If the state was increasing strongly, preserve it
            state = state > this.state.s ? state: this.state.s;

            // Activate the stateful timer
            this.statefulUntil = moment().add(this.stateDurationMinutes, "minutes").valueOf();
        }

        // If there is no longer a state, check if the previous one should be preserved
        else if (this.state.s > 0 && this.statefulUntil && Date.now() <= this.statefulUntil) {
            state = this.state.s;
        }

        // Update the local state
        this.state = {
            s: state,
            m: this.requirements.mean,
            mm: this.requirements.meanMedium,
            mh: this.requirements.meanHigh,
            muh: this.requirements.meanUltraHigh,
            v: current.v
        };

        // Finally, return the state
        return state;
    }






    /**
     * Calculates the state intensity based on the current volume and the requirements.
     * @param currentVolume 
     * @param requirements 
     * @returns IVolumeStateIntensity
     */
    private calculateStateIntensity(
        currentVolume: number, 
        requirements: IVolumeStateRequirements
    ): IVolumeStateIntensity {
        if      (currentVolume >= requirements.meanUltraHigh)   { return 4 }
        else if (currentVolume >= requirements.meanHigh)        { return 3 }
        else if (currentVolume >= requirements.meanMedium)      { return 2 }
        else if (currentVolume >= requirements.mean)            { return 1 }
        else                                                    { return 0 }
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
            muh: 0,
            v: 0
        }
    }







    /**
     * Retrieves the module's default state.
     * @returns IVolumeStateIntensity
     */
    public getDefaultState(): IVolumeStateIntensity { return 0 }














    /*****************************
     * Volume State Requirements *
     *****************************/





    /**
     * Calculates the volume state requirements based on the candlesticks' lookback.
     * @returns IVolumeStateRequirements
     */
    public calculateRequirements(): IVolumeStateRequirements {
        // Iterate over each candlestick, accumulate its values and identify the highest
        let accum: number = 0;
        let highest: number = 0;
        for (let c of this._candlestick.lookback) {
            accum += c.v;
            if (c.v > highest) highest = c.v; 
        }

        // Calculate the mean and the mean high values
        const mean: number = <number>this._utils.outputNumber(
            accum / this._candlestick.lookback.length
        );
        const meanUltraHigh: number = <number>this._utils.calculateAverage([mean, highest]);
        const meanHigh: number = <number>this._utils.calculateAverage([mean, meanUltraHigh]);
        const meanMedium: number = <number>this._utils.calculateAverage([mean, meanHigh]);

        // Finally, return the result
        return {
            mean: mean,
            meanMedium: meanMedium,
            meanHigh: meanHigh,
            meanUltraHigh: meanUltraHigh,
            nextRequirementCalculation: moment().add(1, "hour").valueOf()
        }
    }







    /**
     * Retrieves the default requirements object prior to being calculated.
     * @returns IVolumeStateRequirements
     */
    public getDefaultRequirements(): IVolumeStateRequirements {
        return {
            mean: 0,
            meanMedium: 0,
            meanHigh: 0,
            meanUltraHigh: 0,
            nextRequirementCalculation: 0
        }
    }
}