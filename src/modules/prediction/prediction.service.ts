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
import { IEpochRecord, IEpochService } from "../epoch";
import { ICandlestickService } from "../candlestick";
import { IOrderBookService } from "../order-book";
import { INotificationService } from "../notification";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { 
    IPredictionCandlestick, 
    IPredictionModel, 
    IPredictionService, 
    IPredictionValidations 
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
    @inject(SYMBOLS.OrderBookService)                 private _orderBook: IOrderBookService;
    @inject(SYMBOLS.NotificationService)              private _notification: INotificationService;




    /**
     * Prediction API Request
     * The predictions are generated in the Prediction API container which
     * can be interacted with by using the following request options.
     */
    private options: IExternalRequestOptions = {
        host: "prediction-api",
        path: "",
        method: "GET",
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
    private readonly intervalSeconds: number = 60;


    /**
     * Active Prediction Observable
     * Even though the active prediction can be obtained from this observable, it
     * is recommended to use the getActive method because it performs
     * additional validations.
     */
    public active: BehaviorSubject<IPrediction|undefined> = new BehaviorSubject(undefined);


    /**
     * Prediction Candlesticks
     * In order to optimize how predictions are queried, they will be stored in 
     * candlestick format, following the 30 minute interval.
     * The syncing of the candlesticks only occurs when an epoch is active.
     */
    private candlesticksSyncInterval: any;
    private readonly candlesticksSyncIntervalSeconds: number = 180; // 3 minutes


    /**
     * Signal (To be deprecated)
     */
    private readonly throttleMinutes: number = 10;
    private lastBroadcast: number|undefined = undefined;





    constructor() {}





    /* Retrievers */






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










    /* Initializer */





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
            try { await this.predict(this._epoch.active.value.id) } 
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
                try { await this.predict(this._epoch.active.value.id) } 
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



        /**
         * Prediction Candlesticks
         * If there is an active epoch, initialize the interval that will keep 
         * them in sync.
         */
        if (this._epoch.active.value) {
            // Perform the initial sync safely
            try {
                await this.syncCandlesticks(this._epoch.active.value)
            } catch (e) { console.error(e) }

            // Initialize the interval
            this.candlesticksSyncInterval = setInterval(async () => {
                // Make sure the epoch is still active
                if (this._epoch.active.value) {
                    try {
                        await this.syncCandlesticks(this._epoch.active.value)
                    } catch (e) { console.error(e) }
                }
            }, this.candlesticksSyncIntervalSeconds * 1000);
        }
    }







    /**
     * Stops the prediction service interval and unsets the active
     * prediction.
     */
    public stop(): void {
        if (this.predictionInterval) clearInterval(this.predictionInterval);
        this.predictionInterval = undefined;
        this.active.next(undefined);
        if (this.candlesticksSyncInterval) clearInterval(this.candlesticksSyncInterval);
        this.candlesticksSyncInterval = undefined;
    }













    /* Prediction Generator */




    /**
     * Generates, broadcasts and stores brand new predictions at any
     * point for as long as an Epoch is active.
     * @param epoch_id
     * @returns Promise<void>
     */
    private async predict(epoch_id: string): Promise<void> {
        // Set the path
        this.options.path = `/predict?epoch_id=${epoch_id}`;

        // Generate the prediction with a request to the Prediction API
        const response: IExternalRequestResponse = await this._req.request(this.options, {}, "http");

        // Extract the prediction from the response
        const prediction: IPrediction = this.validations.validateGeneratedPrediction(response);

        // Broadcast the prediction
        this.active.next(prediction);

        // Broadcast the signal (To be deprecated)
        this.broadcastPrediction(prediction);

        // Finally, store it in the database
        await this.model.savePrediction(epoch_id, prediction);
    }









    



    /* Prediction Candlesticks */





    /* Retrievers */





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










    /* Sync Manager */





    /**
     * Syncs the candlesticks for a given epoch.
     * @param epoch 
     * @returns Promise<void>
     */
    private async syncCandlesticks(epoch: IEpochRecord): Promise<void> {
        try {
            // Find all the candlesticks that can be saved
            let candlesticks: IPredictionCandlestick[] = [];

            // Initialize the open & close timestamps
            let openTime: number = epoch.installed;
            let closeTime: number|undefined;

            // Calculate the current time
            const currentTime: number = Date.now();

            // Iterate for as long as there is time in between
            while (openTime <= currentTime) {
                // Calculate the open and close times
                openTime = typeof closeTime == "number" ? closeTime + 1: await this.model.getLastOpenTimestamp(epoch.id, epoch.installed);
                closeTime = this.model.getPredictionCandlestickCloseTime(openTime);

                // Retrieve all the predictions within the period
                const preds: IPrediction[] = await this.model.listPredictions(epoch.id, openTime, closeTime);

                // Make sure there are predictions in the range
                if (preds.length > 0) {
                    // Build the candlestick
                    const candlestick: IPredictionCandlestick = this.model.buildCandlestick(preds);

                    // Add it to the list of saveable candlesticks
                    candlesticks.push(candlestick);
                }
            }

            // Finally, save the candlesticks if any was found
            if (candlesticks.length) await this.model.savePredictionCandlesticks(epoch.id, candlesticks);
        } catch (e) { console.error(e) }
    }








    





    /* Signal */




    public async broadcastPrediction(pred: IPrediction|undefined): Promise<void> {
        // Init the current time
        const currentTime: number = Date.now();

        // Check if a signal should be broadcasted
        if (
            this._epoch.active.value && 
            pred && 
            pred.r != 0 &&
            (this.lastBroadcast == undefined || this.lastBroadcast < moment(currentTime).subtract(this.throttleMinutes, "minutes").valueOf())
        ) {
            try {
                // Init signal
                let signal: {
                    kind: IPredictionResult, 
                    entry: number, 
                    takeProfit: number,
                    stopLoss: number
                } = { kind: 0, entry: 0, takeProfit: 0, stopLoss: 0 }

                // Retrieve the safe rates from order book
                const { safe_bid, safe_ask } = await this._orderBook.getBook();

                // Handle a long prediction
                if (pred.r == 1) {
                    signal = {
                        kind: 1,
                        entry: safe_ask,
                        takeProfit: <number>this._utils.alterNumberByPercentage(
                            safe_ask, 
                            this._epoch.active.value.model.price_change_requirement,
                            {dp: 0, ru: true}
                        ),
                        stopLoss: <number>this._utils.alterNumberByPercentage(
                            safe_ask, 
                            -this._epoch.active.value.model.price_change_requirement,
                            {dp: 0, ru: true}
                        )
                    }
                }

                // Otherwise, handle a short prediction
                else {
                    signal = {
                        kind: -1,
                        entry: safe_bid,
                        takeProfit: <number>this._utils.alterNumberByPercentage(
                            safe_bid, 
                            -this._epoch.active.value.model.price_change_requirement,
                            {dp: 0, ru: true}
                        ),
                        stopLoss: <number>this._utils.alterNumberByPercentage(
                            safe_bid, 
                            this._epoch.active.value.model.price_change_requirement,
                            {dp: 0, ru: true}
                        )
                    }
                }

                // Broadcast the signal
                await this._notification.broadcast({
                    sender: "PREDICTION",
                    title: `${signal.kind == 1 ? 'Long': 'Short'} Signal (${pred.s})`,
                    description: `Entry: ${signal.entry}\nTake Profit: ${signal.takeProfit}\nStop Loss: ${signal.stopLoss}`
                });
                this.lastBroadcast = currentTime;
            } catch (e) { console.error(e) }
        }
    }
}