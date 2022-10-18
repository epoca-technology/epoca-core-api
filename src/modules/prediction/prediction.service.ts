import {inject, injectable} from "inversify";
import { BehaviorSubject } from "rxjs";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IApiErrorService } from "../api-error";
import { IEpochService } from "../epoch";
import { ICandlestickService } from "../candlestick";
import { INotificationService } from "../notification";
import { IPrediction } from "../epoch-builder";
import { IPredictionModel, IPredictionService, IPredictionValidations } from "./interfaces";




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
    public active: BehaviorSubject<IPrediction|undefined> = new BehaviorSubject(undefined)





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
     * @param limit 
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPrediction[]>
     */
    public async listPredictions(
        epochID: string, 
        limit: number, 
        startAt?: number, 
        endAt?: number
    ): Promise<IPrediction[]> {
        // Init the starting or ending point
        startAt = isNaN(startAt) || startAt == 0 ? undefined: startAt;
        endAt = isNaN(endAt) || endAt == 0 ? undefined: endAt;

        // Validate the request
        this.validations.canListPredictions(epochID, limit, startAt, endAt);

        // Finally, return the list of predictions
        return await this.model.listPredictions(epochID, limit, startAt, endAt);
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
    }






    /**
     * Stops the prediction service interval and unsets the active
     * prediction.
     */
    public stop(): void {
        if (this.predictionInterval) clearInterval(this.predictionInterval);
        this.active.next(undefined);
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

        // Finally, store it in the database
        console.log(prediction);
        await this.model.savePrediction(epoch_id, prediction);
    }
}