import {injectable, inject} from "inversify";
import { Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IPrediction } from "../epoch-builder";
import { IPredictionCandlestick, IPredictionService } from "../prediction";
import { IDatabaseService } from "../database";
import { IUtilitiesService, IValidationsService } from "../utilities";
import {
    IStateUtilitiesService,
    ITrendStateService,
    ITrendState,
    IStateType,
    ISplitStateResult,
    ISplitStates,
    ITrendStateConfiguration
} from "./interfaces";




@injectable()
export class TrendStateService implements ITrendStateService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.PredictionService)                  private _prediction: IPredictionService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Configuration
     * The configuration that will be used in order to calculate the 
     * state of the trend.
     */
    public config: ITrendStateConfiguration;


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
        // Initialize the configuration
        await this.initializeConfiguration();

        // Build the default state and subscribe to the predictions
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






















    

    /*********************
     * State Calculation *
     *********************/









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
            if      (diff >= this.config.strongRequirement) { state = -2 }
            else if (diff >= this.config.requirement)       { state = -1 }
        } else if (initial < final) {
            if      (diff >= this.config.strongRequirement) { state = 2 }
            else if (diff >= this.config.requirement)       { state = 1 }
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



















    /****************************
     * Configuration Management *
     ****************************/






    /**
     * Initializes the Trend's Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: ITrendStateConfiguration|undefined = await this.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Trend's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: ITrendStateConfiguration): Promise<void> {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided trend config object is invalid.`, 28000));
        }
        if (!this._val.numberValid(newConfiguration.requirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided requirement (${newConfiguration.requirement}) is invalid.`, 28001));
        }
        if (!this._val.numberValid(newConfiguration.strongRequirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided strongRequirement (${newConfiguration.strongRequirement}) is invalid.`, 28002));
        }
        if (newConfiguration.requirement >= newConfiguration.strongRequirement) {
            throw new Error(this._utils.buildApiError(`The requirement cannot be greater than or equals to the 
            strongRequirement. Received: ${newConfiguration.requirement} | ${newConfiguration.strongRequirement}.`, 28003));
        }

        // Store the new config on the db and update the local property
        await this.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }









    /* Configuration Record Management */






    /**
     * Retrieves the Trend's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<ITrendStateConfiguration|undefined>
     */
    private async getConfigurationRecord(): Promise<ITrendStateConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.trend_state_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Trend' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    private async createConfigurationRecord(defaultConfiguration: ITrendStateConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.trend_state_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Trend's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    private async updateConfigurationRecord(newConfiguration: ITrendStateConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.trend_state_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }







    /* Misc Helpers */



    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns ITrendStateConfiguration
     */
    private buildDefaultConfig(): ITrendStateConfiguration {
        return {
            requirement: 0.025,
            strongRequirement: 0.35
        }
    }
}