import {inject, injectable} from "inversify";
import { BehaviorSubject } from "rxjs";
import * as moment from "moment";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    IExternalRequestOptions, 
    IExternalRequestResponse, 
    IExternalRequestService 
} from "../external-request";
import { IApiErrorService } from "../api-error";
import { IEpochService } from "../epoch";
import { ICandlestickService } from "../candlestick";
import { INotificationService } from "../notification";
import { IPrediction } from "../epoch-builder";
import { 
    IPredictionCandlestick, 
    IPredictionModel, 
    IPredictionRequestBody, 
    IPredictionService, 
    IPredictionState, 
    IPredictionStateIntensityConfig, 
    IPredictionStateIntesity,
    IPredictionStateResult,
    IPredictionValidations,
} from "./interfaces";




@injectable()
export class PredictionService implements IPredictionService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionValidations)            private validations: IPredictionValidations;
    @inject(SYMBOLS.PredictionModel)                  private model: IPredictionModel;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;
    @inject(SYMBOLS.ExternalRequestService)           private _req: IExternalRequestService;
    @inject(SYMBOLS.ApiErrorService)                  private _apiError: IApiErrorService;
    @inject(SYMBOLS.EpochService)                     private _epoch: IEpochService;
    @inject(SYMBOLS.CandlestickService)               private _candlestick: ICandlestickService;
    @inject(SYMBOLS.NotificationService)              private _notification: INotificationService;




    /**
     * Prediction API Request
     * The predictions are generated in the Prediction API container which
     * can be interacted with by using the following request options.
     */
    private options: IExternalRequestOptions = {
        host: "prediction-api",
        path: "/predict",
        method: "POST",
        port: 5000,
        headers: {
            "Content-Type": "application/json",
            "secret-key": environment.FLASK_SECRET_KEY
        }
    }


    /**
     * Prediction Generator Interval
     * Every intervalSeconds a prediction will be generated, broadcasted
     * and stored if there is an active epoch.
     */
    private predictionInterval: any;
    private readonly intervalSeconds: number = 10;


    /**
     * Active Prediction Observable
     * Even though the active prediction can be obtained from this observable, it
     * is recommended to use the getActive method because it performs
     * additional validations.
     */
    public active: BehaviorSubject<IPrediction|undefined> = new BehaviorSubject(undefined);

    /**
     * Active Prediction State
     * The state of the prediction stands for the trend being followed by the
     * last 5 hours worth of candlesticks. The states are the following:
     * 1) Flat: there isn't a clear trend being followed and is represented by a 0.
     * 2) Up: there is an increase trend and is be represented by an int from 1 to 9.
     * 3) Down: there is a decrease trend and is be represented by an int from -1 to -9.
     * The number represents the number of candlesticks backing the trend. The higher, 
     * the more intense.
     */
    public activeState: IPredictionState = 0;


    /**
     * Active Prediction State Intensity
     * The intensity of the direction the trend is taking.
     */
    public stateIntensityConfig: IPredictionStateIntensityConfig;
    public activeStateIntesity: IPredictionStateIntesity = 0;






    constructor() {}









    /**************
     * Retrievers *
     **************/






    /**
     * Retrieves the last generated prediction. If there isn't
     * an active prediction or the duration has expired, it 
     * throws an error.
     * This function should be used by other modules that strictly
     * need an active prediction. It should not be used by the
     * route as the GUI can handle an undefined active prediction.
     * @returns IPrediction
     */
    public getActive(): IPrediction {
        // Make sure the active prediction is valid
        this.validations.validateActivePrediction(this.active.value);

        // If everything is ok, return it
        return this.active.value;
    }







    /**
     * Lists the prediction for a given epoch based on the provided params.
     * @param epochID 
     * @param startAt 
     * @param endAt
     * @returns Promise<IPrediction[]>
     */
    public async listPredictions(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPrediction[]> {
        // Init the starting or ending point as well as the limit
        startAt = isNaN(startAt) || startAt == 0 ? undefined: startAt;
        endAt = isNaN(endAt) || endAt == 0 ? undefined: endAt;

        // Validate the request
        this.validations.canListPredictions(epochID, startAt, endAt, false);

        // Finally, return the list of predictions
        return await this.model.listPredictions(epochID, startAt, endAt);
    }










    /***************
     * Initializer *
     ***************/






    /**
     * Initializes the interval that will generate, store and broadcast
     * predictions every intervalSeconds. The generator is only invoked
     * when there is an active Epoch.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the state intensity config
        await this.initializeStateIntensityConfig();

        /**
         * If there is an active epoch and the candlesticks are in sync, 
         * generate a prediction right away. Otherwise, let the interval
         * handle the first prediction.
         * When there is an error of any kind, it is handled safely, stored
         * by the ApiError Module and sent to Epoca's users in order to 
         * ensure a quick response.
         */
        if (this._epoch.active.value && this._candlestick.isStreamInSync(this._candlestick.stream.value)) {
            try { await this.predict() } 
            catch (e) { 
                console.error(e);
                await Promise.all([
                    this._apiError.log("PredictionService.predict", e, undefined, undefined, {
                        epoch_id: this._epoch.active.value.id
                    }),
                    this._notification.predictionGenerationIssue(e)
                ]);
            }
        }

        /**
         * Start the interval that will handle the generation and processing
         * of predictions. The predict functionality should only be invoked
         * when there is an active epoch.
         */
        this.predictionInterval = setInterval(async () => {
            if (this._epoch.active.value) {
                try { await this.predict() } 
                catch (e) { 
                    console.error(e);
                    await Promise.all([
                        this._apiError.log("PredictionService.predict", e, undefined, undefined, {
                            epoch_id: this._epoch.active.value.id
                        }),
                        this._notification.predictionGenerationIssue(e)
                    ]);
                }
            }
        }, this.intervalSeconds * 1000);
    }







    /**
     * Stops the prediction service interval and unsets the active
     * prediction.
     */
    public stop(): void {
        if (this.predictionInterval) clearInterval(this.predictionInterval);
        this.predictionInterval = undefined;
        this.active.next(undefined);
        this.activeState = 0;
        this.activeStateIntesity = 0;
    }














    /************************
     * Prediction Generator *
     ************************/




    /**
     * Generates, broadcasts and stores brand new predictions at any
     * point for as long as an Epoch is active.
     * @returns Promise<void>
     */
    private async predict(): Promise<void> {
        // Generate the prediction with a request to the Prediction API
        const response: IExternalRequestResponse = await this._req.request(
            this.options, 
            this.buildPredictionRequestBody(), 
            "http"
        );

        // Extract the prediction from the response
        const prediction: IPrediction = this.validations.validateGeneratedPrediction(response);

        // Finally, store it in the database
        await this.model.savePrediction(this._epoch.active.value.id, prediction);

        // Sync the candlesticks
        await this.syncCandlesticks();

        // Update the prediction state and the intensity
        const { state, intensity } = await this.getActiveState(prediction);
        this.activeState = state;
        this.activeStateIntesity = intensity;

        // Broadcast the prediction
        this.active.next(prediction);
    }






    /**
     * Builds and validates the body that will be sent to the prediction api
     * in order to generate new predictions.
     * @returns IPredictionRequestBody
     */
    private buildPredictionRequestBody(): IPredictionRequestBody {
        // Make sure the epoch is active
        if (!this._epoch.active.value) {
            throw new Error(this._utils.buildApiError(`A prediction cannot be generated if there isn't an active epoch.`, 20000));
        }

        // Calculate the number of items required to build the input dataset
        const listSize: number = (this._epoch.active.value.config.sma_window_size + this._epoch.active.value.config.regression_lookback) - 1;
        
        // Ensure the candlesticks lookback has sufficient items
        if (listSize > this._candlestick.predictionLookback.length) {
            throw new Error(this._utils.buildApiError(`The candlestick's lookback is not big enough to generate the input dataset in 
            order for the model to generate predictions. Has ${this._candlestick.predictionLookback.length}. Needs: ${listSize}`, 20001));
        }

        // Ensure the candlesticks lookback is synced
        if (!this._candlestick.isStreamInSync(this._candlestick.stream.value)) {
            throw new Error(this._utils.buildApiError(`New predictions cannot be generated as the candlesticks stream is out of sync.`, 20002));
        }

        // Finally, return the body
        return {
            epoch_id: this._epoch.active.value.id,
            trend_state: this.activeState,
            trend_state_intensity: this.activeStateIntesity,
            close_prices: this._candlestick.predictionLookback.slice(-(listSize)).map((candlestick) => candlestick.c)
        }
    }














    

    /***************************
     * Prediction Candlesticks *
     ***************************/




    /**
     * Lists the prediction candlesticks for a given epoch based on the provided params.
     * @param epochID 
     * @param startAt 
     * @param endAt
     * @returns Promise<IPredictionCandlestick[]>
     */
    public async listPredictionCandlesticks(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPredictionCandlestick[]> {
        // Init the starting or ending point as well as the limit
        startAt = isNaN(startAt) || startAt == 0 ? undefined: startAt;
        endAt = isNaN(endAt) || endAt == 0 ? undefined: endAt;

        // Validate the request
        this.validations.canListPredictions(epochID, startAt, endAt, true);

        // Finally, return the list of predictions
        return await this.model.listPredictionCandlesticks(epochID, startAt, endAt);
    }






    /**
     * Syncs the candlesticks for the active epoch.
     * @returns Promise<void>
     */
    private async syncCandlesticks(): Promise<void> {
        try {
            // Find all the candlesticks that can be saved
            let candlesticks: IPredictionCandlestick[] = [];

            // Initialize the open & close timestamps
            let openTime: number = this._epoch.active.value.installed;
            let closeTime: number|undefined;

            // Calculate the current time
            const currentTime: number = Date.now();

            // Iterate for as long as there is time in between
            while (openTime <= currentTime) {
                // Calculate the open and close times
                openTime = typeof closeTime == "number" ? closeTime + 1: await this.model.getLastOpenTimestamp(
                    this._epoch.active.value.id, 
                    this._epoch.active.value.installed
                );
                closeTime = this.model.getPredictionCandlestickCloseTime(openTime);

                // Retrieve all the minified predictions within the period
                const preds: Partial<IPrediction>[] = await this.model.listMinifiedPredictions(
                    this._epoch.active.value.id, 
                    openTime, 
                    closeTime
                );

                // Make sure there are predictions in the range
                if (preds.length > 0) {
                    // Build the candlestick
                    const candlestick: IPredictionCandlestick = this.model.buildCandlestick(preds);

                    // Add it to the list of saveable candlesticks
                    candlesticks.push(candlestick);
                }
            }

            // Finally, save the candlesticks if any was found
            if (candlesticks.length) {
                await this.model.savePredictionCandlesticks(
                    this._epoch.active.value.id, 
                    candlesticks
                );
            }
        } catch (e) { console.error(e) }
    }













    

    /********************
     * Prediction State *
     ********************/





    /**
     * Calculates the prediction state based on the past 5 hours worth
     * of data. If there are less than 7 candlesticks within the range,
     * it returns 0.
     * @param pred 
     * @returns Promise<IPredictionStateResult>
     */
    private async getActiveState(pred: IPrediction): Promise<IPredictionStateResult> {
        // Retrieve the candlesticks
        const candlesticks: IPredictionCandlestick[] = await this.model.listPredictionCandlesticks(
            this._epoch.active.value.id,
            moment(pred.t).subtract(3, "hours").valueOf(),
            pred.t
        );

        // Make sure there are enough candlesticks within the range
        if (candlesticks.length >= 7) {
            // Iterate over each candlestick in order to determine the trend and the count
            let i: number = candlesticks.length - 1;
            let sequenceType: 1|0|-1 = 0;
            let sequenceCount: number = 0;
            let sequenceEnded: boolean = candlesticks.at(-1).c == candlesticks.at(-2).c;
            while (i > 0 && sequenceEnded == false) {
                // Check if the current value is greater than the previous one (Potential uptrend sequence)
                if (candlesticks[i].c > candlesticks[i - 1].c) {
                    // If there was a downtrend sequence, end the loop
                    if (sequenceType == -1) { sequenceEnded = true }

                    // Otherwise, set the sequence type
                    else {
                        sequenceType = 1;
                        sequenceCount += 1;
                    }
                }

                // Check if the current value is less than the previous one (Potential downtrend sequence)
                else if (candlesticks[i].c < candlesticks[i - 1].c) {
                    // If there was an uptrend sequence, end the loop
                    if (sequenceType == 1) { sequenceEnded = true }

                    // Otherwise, set the sequence type
                    else {
                        sequenceType = -1;
                        sequenceCount += 1;
                    }
                }

                // Decrement the counter
                i -= 1;
            }

            // Build the state
            const state: IPredictionState = sequenceType == -1 ? <IPredictionState>-(sequenceCount): <IPredictionState>sequenceCount;

            // Calculate the intensity
            const intensity: IPredictionStateIntesity = this.calculateStateIntensity(candlesticks, state);

            // Finally, return the results
            return { state: state, intensity: intensity };
        } 
        
        // Otherwise, return a completely flat state
        else { return { state: 0, intensity: 0 } }
    }





    /**
     * Calculates the intensity of the trend's direction.
     * @param candlesticks 
     * @param state 
     * @returns IPredictionStateIntesity
     */
    private calculateStateIntensity(
        candlesticks: IPredictionCandlestick[], 
        state: IPredictionState
    ): IPredictionStateIntesity {
        // If the state is 0, there is no intensity
        if (state == 0) { return 0 }

        // Otherwise, calculate the intensity
        else {
            // Initialize the initial and the current sums
            const initial: number = candlesticks[candlesticks.length - Math.abs(state)].sm;
            const current: number = candlesticks.at(-1).c;

            // Calculate the absolute difference
            const absDiff: number = this.calculateAbsoluteTrendSumDifference(initial, current);

            // Check if the intensity is strong
            if (absDiff >= this.stateIntensityConfig.strongRequirement) {
                return state > 0 ? 2: -2;
            }

            // Check if there is intensity
            else if (absDiff >= this.stateIntensityConfig.requirement) {
                return state > 0 ? 1: -1;
            }

            // Otherwise, there is no intensity
            else { 
                return 0;
            }
        }
    }





    /**
     * Calculates the absolute trend sum difference based on an initial and a current trend sum.
     * @param initialSum 
     * @param currentSum 
     * @returns number
     */
    public calculateAbsoluteTrendSumDifference(initialSum: number, currentSum: number): number {
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










    /************************************************
     * Prediction State Intensity Config Management *
     ************************************************/





    /**
     * Initializes the state intensity config. In case it hadn't been,
     * it will create it.
     */
    private async initializeStateIntensityConfig(): Promise<void> {
        this.stateIntensityConfig = await this.model.getStateIntensityConfig();
        if (!this.stateIntensityConfig) {
            this.stateIntensityConfig = { requirement: 0.25, strongRequirement: 0.5 };
            await this.model.createStateIntensityConfig(this.stateIntensityConfig);
        }
    }




    /**
     * Updates the current state intensity configuration.
     * @param newConfig 
     * @returns Promise<void>
     */
    public async updateStateIntensityConfig(newConfig: IPredictionStateIntensityConfig): Promise<void> {
        // Make sure it can be updated
        this.validations.validateStateIntensityConfig(newConfig);

        // Update the record
        await this.model.updateStateIntensityConfig(newConfig);

        // Update the local strategy
        this.stateIntensityConfig = newConfig;
    }
}