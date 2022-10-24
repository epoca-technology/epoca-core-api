import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { IExternalRequestResponse } from "../external-request";
import { IPrediction } from "../epoch-builder";






// Service
export interface IPredictionService {
    // Properties
    active: BehaviorSubject<IPrediction|undefined>,

    // Retrievers
    getActive(): IPrediction,
    listPredictions(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPrediction[]>,
    
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Prediction Candlesticks
    listPredictionCandlesticks(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<IPredictionCandlestick[]>,
}




// Validations
export interface IPredictionValidations {
    // Retrievers
    validateActivePrediction(pred: IPrediction|undefined): void,
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
    /* Predictions Management */

    // Retrievers
    listPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPrediction[]>,

    // Prediction Saving
    savePrediction(epochID: string, pred: IPrediction): Promise<void>,


    /* Predictions Candlestick Management */

    // Candlesticks Retrievers
    listPredictionCandlesticks(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPredictionCandlestick[]>,
    getLastOpenTimestamp(epochID: string, epochInstalled: number): Promise<number>,


    // Candlesticks Saving
    savePredictionCandlesticks(epochID: string, candlesticks: IPredictionCandlestick[]): Promise<void>,

    // Candlesticks Misc Helpers
    buildCandlestick(preds: IPrediction[]): IPredictionCandlestick,
    getPredictionCandlestickCloseTime(ot: number): number,
}








// Prediction Candlestick Record
export interface IPredictionCandlestick {
    ot: number,                 // Open Time
    ct: number,                 // Close Time
    o: number,                  // Open Sum
    h: number,                  // High Sum
    l: number,                  // Low Sum
    c: number,                  // Close Sum
    sm: number                  // Sum Mean
}




/* TO BE DEPRECATED */
export interface ISignalService {
    
}