import {inject, injectable} from "inversify";
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
     * The limit of data in milliseconds that can be read per request.
     */
    private readonly predictionListLimit: number = 1 * 60 * 60 * 1000;                          // 1 Hour
    private readonly predictionCandlesticksListLimit: number = 240 * 24 * 60 * 60 * 1000;       // 240 days




    constructor() {}








    /**************
     * Retrievers *
     **************/







    /**
     * Verifies if the provided data to list the predictions is valid
     * and meets the conditions.
     * @param epochID 
     * @param startAt 
     * @param endAt 
     * @param listingCandlesticks?
     */
    public canListPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined,
        listingCandlesticks?: boolean, 
    ): void {
        // Validate the Epoch ID
        if (!this._validations.epochIDValid(epochID)) {
            throw new Error(this._utils.buildApiError(`The provided Epoch ID (${epochID}) is invalid.`, 21001));
        }

        // Make sure the start and the end have been provided
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The predictions range is invalid. Received: ${startAt} - ${endAt}.`, 21002));
        }

        // The start cannot be greater or equals to the end
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The predictions starting point must be less than the end. Received: ${startAt} - ${endAt}.`, 21003));
        }

        // Make sure the query does not exceed 15 days worth of data
        const dataLimit: number = listingCandlesticks ? this.predictionCandlesticksListLimit: this.predictionListLimit;
        const difference: number = endAt - startAt;
        if (difference > dataLimit) {
            throw new Error(this._utils.buildApiError(`The predictions query is larger than the permitted data limit. 
            Limit: ${dataLimit}, Received: ${difference}`, 21006));
        }
    }















    /************************
     * Prediction Generator *
     ************************/





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