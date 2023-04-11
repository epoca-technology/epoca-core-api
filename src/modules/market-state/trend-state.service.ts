import {injectable, inject} from "inversify";
import { Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IPrediction } from "../epoch-builder";
import { IPredictionCandlestick, IPredictionService } from "../prediction";
import {
    IStateUtilitiesService,
    ITrendStateService,
    ITrendState,
    IStateType,
    ISplitStateResult,
    ISplitStates,
} from "./interfaces";




@injectable()
export class TrendStateService implements ITrendStateService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)                  private _prediction: IPredictionService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;


    /**
     * Requirements
     * The trend sum changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly requirement: number = 0.025;
    private readonly strongRequirement: number = 0.35;


    /**
     * Prediction Subscription
     * The trend state is calculated whenever a new prediction is generated.
     */
    private predictionSub: Subscription;


    /**
     * State
     * The state property is only updated when a new prediction is generated.
     */
    public state: ITrendState;




    constructor() { }





    /***************
     * Initializer *
     ***************/





    /**
     * Calculates the state and initializes the interval that will
     * update the state every intervalSeconds.
     * @returns  Promise<void>
     */
    public async initialize(): Promise<void> {
        this.state = this.getDefaultState();
        this.predictionSub = this._prediction.active.subscribe((pred: IPrediction|undefined) => {
            if (pred) this.calculateState(); 
        });
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.predictionSub) this.predictionSub.unsubscribe();
    }








    

    /* State Calculation */









    /**
     * Calculates the trend state for the current window.
     */
    private calculateState(): void {
        // Only update the state if there are at least 5 candlesticks in the window
        if (this._prediction.window.length >= 5) {
            const { averageState, splitStates } = this.calculateCurrentState(this._prediction.window);
            this.state = { s: averageState, ss: splitStates, w: this._prediction.window };
        } else { this.state = this.getDefaultState() }
    }













    /**
     * Calculates the current state for each split. Finally, calculates the
     * average state and returns it as well as the split states.
     * @param series 
     * @param requirement 
     * @param strongRequirement 
     * @returns { averageState: IStateType, splitStates: ISplitStates }
     */
    public calculateCurrentState(series: IPredictionCandlestick[]): { averageState: IStateType, splitStates: ISplitStates } {
        // Build the split states
        const states: ISplitStates = {
            s100: this.calculateSplitStateResult(series),
            s75: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.75))),
            s50: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.5))),
            s25: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.25))),
            s15: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.15))),
            s10: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.10))),
            s5: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.05))),
            s2: this.calculateSplitStateResult(series.slice(series.length - Math.ceil(series.length * 0.02))),
        }

        // Finally, return the average state and the split results
        return {
            averageState: this._stateUtils.calculateAverageState([
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
     * @returns ISplitStateResult
     */
    private calculateSplitStateResult(series: IPredictionCandlestick[]): ISplitStateResult {
        // Initialize the first and last values
        const initial: number = series[0].c;
        const final: number = series.at(-1).c;

        // Calculate the absolute trend sum difference
        const diff: number = this.calculateAbsoluteTrendSumDifference(initial, final);

        // Calculates the state based on the difference
        let state: IStateType = 0;
        if (initial > final) {
            if      (diff >= this.strongRequirement) { state = -2 }
            else if (diff >= this.requirement)       { state = -1 }
        } else if (initial < final) {
            if      (diff >= this.strongRequirement) { state = 2 }
            else if (diff >= this.requirement)       { state = 1 }
        }

        // Finally, return the result
        return { s: state, c: diff }
    }







    
    /**
     * Calculates the absolute trend sum difference based on an initial and a current trend sum.
     * @param initialSum 
     * @param currentSum 
     * @returns number
     */
    private calculateAbsoluteTrendSumDifference(initialSum: number, currentSum: number): number {
        // Handle an increased trend sum
        if (currentSum > initialSum) {
            return Math.abs(currentSum - initialSum);
        }

        // Handle a decreased trend sum
        else if (initialSum > currentSum) {
            return Math.abs(initialSum - currentSum);
        }

        // Otherwise, there is no difference
        else {
            return 0;
        }
    }













    /* Misc Helpers */






    /**
     * Retrieves the module's default state.
     * @returns IWindowState
     */
    public getDefaultState(): ITrendState {
        return {
            s: 0,
            ss: {
                s100: {s: 0, c: 0},
                s75: {s: 0, c: 0},
                s50: {s: 0, c: 0},
                s25: {s: 0, c: 0},
                s15: {s: 0, c: 0},
                s10: {s: 0, c: 0},
                s5: {s: 0, c: 0},
                s2: {s: 0, c: 0},
            },
            w: []
        }
    }
}