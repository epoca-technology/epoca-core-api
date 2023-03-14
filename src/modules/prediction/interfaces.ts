import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { IExternalRequestResponse } from "../external-request";
import { IPrediction } from "../epoch-builder";






// Service
export interface IPredictionService {
    // Properties
    active: BehaviorSubject<IPrediction|undefined>,
    window: IPredictionCandlestick[],

    // Retrievers
    listPredictions(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPrediction[]>,
    listPredictionCandlesticks(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPredictionCandlestick[]>,
    
    // Initializer
    initialize(): Promise<void>,
    stop(): void
}




// Validations
export interface IPredictionValidations {
    // Retrievers
    canListPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined,
        listingCandlesticks?: boolean, 
    ): void,

    // Prediction Generator
    validateGeneratedPrediction(response: IExternalRequestResponse): IPrediction
}



// Model
export interface IPredictionModel {
    // Retrievers
    listPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPrediction[]>,
    listPredictionCandlesticks(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPredictionCandlestick[]>,
    getPredictionCandlestickCloseTime(ot: number): number,

    // Saver
    savePrediction(
        epochID: string, 
        pred: IPrediction,
        activeCandle: IPredictionCandlestick|undefined, 
        newCandle: IPredictionCandlestick|undefined
    ): Promise<void>
}






/**
 * Prediction Request Body
 * The body sent to the Prediction API in order to generate a prediction.
 */
export interface IPredictionRequestBody {
    // The identifier of the Epoch
    epoch_id: string,

    // The list of up-to-date close prices
    close_prices: number[]
}






// Prediction Candlestick Record
export interface IPredictionCandlestick {
    ot: number,                 // Open Time
    ct: number,                 // Close Time
    o: number,                  // Open Sum
    h: number,                  // High Sum
    l: number,                  // Low Sum
    c: number,                  // Close Sum
}