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
    private readonly intervalSeconds: number = 45;


    /**
     * Active Prediction Observable
     * Even though the active prediction can be obtained from this observable, it
     * is recommended to use the getActive method because it performs
     * additional validations.
     */
    public active: BehaviorSubject<IPrediction|undefined> = new BehaviorSubject(undefined);


    /**
     * Prediction Candlesticks Window
     * The system keeps the candlesticks window (~32 hours) in RAM for performance
     * reasons as it improves the general management of the candlesticks and 
     * simplifies the interactions with the market state module.
     */
    public window: IPredictionCandlestick[] = [];




    constructor() {}









    /**************
     * Retrievers *
     **************/









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
            } else { this.window = [] }
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

        // Store the prediction
        await this.savePrediction(prediction);

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
            close_prices: this._candlestick.predictionLookback.slice(-(listSize)).map((candlestick) => candlestick.c)
        }
    }









    /**
     * Triggers whenever a new prediction is generated. Stores the original
     * record and creates/updates the candlestick for the period.
     * @param pred 
     * @returns Promise<void>
     */
    private async savePrediction(pred: IPrediction): Promise<void> {
        // Init the candlestick objects
        let activeCandle: IPredictionCandlestick|undefined = undefined;
        let newCandle: IPredictionCandlestick|undefined = undefined;

        /**
         * If there are no candlesticks in the window, attempt to load them 
         * from the database.
         */
        if (!this.window.length) {
            this.window = await this.model.listPredictionCandlesticks(
                this._epoch.active.value.id,
                moment(pred.t).subtract(32, "hours").valueOf(),
                pred.t
            );
        }

        // Check if there are candlesticks in the window
        if (this.window.length) {
            // Initialize the active candlestick
            activeCandle = this.window.at(-1);

            // If the active candlestick is closed, build a brand new one
            if (pred.t > this.model.getPredictionCandlestickCloseTime(activeCandle.ot)) {
                newCandle = this.buildNewCandlestickFromPrediction(pred);
            }

            // Otherwise, update its values
            else {
                activeCandle.h = pred.s > activeCandle.h ? pred.s: activeCandle.h;
                activeCandle.l = pred.s < activeCandle.l ? pred.s: activeCandle.l;
                activeCandle.c = pred.s;
                activeCandle.ct = pred.t;
            }
        }

        // If no candlesticks were found, initialize the new one
        else { newCandle = this.buildNewCandlestickFromPrediction(pred) }

        // Save the prediction
        await this.model.savePrediction(
            this._epoch.active.value.id, 
            pred,
            activeCandle,
            newCandle
        );

        // If there is an active candlestick, update it
        if (activeCandle) this.window[this.window.length - 1] = activeCandle;

        // If there is a new candlestick, add it to the window
        if (newCandle) this.window.push(newCandle); 

        // Finally, slice the candlesticks so they match the window perfectly
        this.window = this.window.slice(-128);
    }







    /**
     * Builds a brand new candlestick based on the current prediction.
     * @param pred 
     * @returns IPredictionCandlestick
     */
    private buildNewCandlestickFromPrediction(pred: IPrediction): IPredictionCandlestick {
        return {
            ot: pred.t,
            ct: pred.t + 1000,
            o: pred.s,
            h: pred.s,
            l: pred.s,
            c: pred.s
        }
    }
}