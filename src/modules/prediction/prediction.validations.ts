import {inject, injectable} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { IExternalRequestResponse } from "../external-request";
import { IPrediction } from "../epoch-builder";
import { IPredictionValidations } from "./interfaces";




@injectable()
export class PredictionValidations implements IPredictionValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;
    @inject(SYMBOLS.ValidationsService)               private _validations: IValidationsService;




    /**
     * Prediction Duration
     * If a prediction was generated prior to this value, it is considered to be 
     * expired and should not be traded.
     */
     private readonly predictionDurationSeconds: number = 120;





    constructor() {}






    /* Retrievers */






    /**
     * Validates the active prediction and throws an error if a 
     * condition is not met.
     * @param pred 
     */
    public validateActivePrediction(pred: IPrediction|undefined): void {
        // Make sure it is a valid object
        if (!pred || typeof pred != "object") {
            throw new Error(this._utils.buildApiError(`The active prediction is undefined.`, 21004));
        }

        // Calculate the minimum acceptable timestamp and make sure it is still active
        const min: number = moment(Date.now()).subtract(this.predictionDurationSeconds, "seconds").valueOf();
        if (pred.t < min) {
            throw new Error(this._utils.buildApiError(`The active prediction's duration has run out. \
            Needs: ${min}, Has: ${pred.t}.`, 21005));
        }
    }







    /**
     * Verifies if the provided data to list the predictions is valid
     * and meets the conditions.
     * @param epochID 
     * @param limit 
     * @param startAt 
     * @param endAt 
     */
    public canListPredictions(
        epochID: string, 
        limit: number, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): void {
        // Validate the Epoch ID
        if (!this._validations.epochIDValid(epochID)) {
            throw new Error(this._utils.buildApiError(`The provided Epoch ID (${epochID}) is invalid.`, 21001));
        }

        // Validate the limit
        if (typeof limit != "number" || limit < 1 || limit > 300) {
            throw new Error(this._utils.buildApiError(`The provided prediction limit (${limit}) is invalid. \
            It must be an int ranging 1 and 300.`, 21002));
        }

        // Make sure a maximum of 1 query was provided
        if (typeof startAt == "number" && typeof endAt == "number") {
            throw new Error(this._utils.buildApiError(`Only one query (startAt|endAt) is allowed when \
            retrieving predictions. Received: ${startAt} - ${endAt}.`, 21003));
        }
    }









    /* Prediction Generator */





    /**
     * Given an HTTP Response, it will evaluate if it was successful. If so, 
     * extracts the prediction from the API Response and returns it. Otherwise,
     * it throws an error.
     * @param response 
     * @returns IPrediction
     */
    public validateGeneratedPrediction(response: IExternalRequestResponse): IPrediction {
        // Validate the response object
        if (!response || typeof response != "object" || !response.data || typeof response.data.success != "boolean") {
            console.log(response);
            throw new Error(this._utils.buildApiError("The Prediction API returned an invalid response when predicting.", 21000));
        }

        // Validate the api response
        if (!response.data.success) throw new Error(response.data.error);

        // Finally, return the prediction
        return <IPrediction>response.data.data;
    }
}