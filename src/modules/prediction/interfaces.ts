import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { IExternalRequestResponse } from "../external-request";
import { IPrediction } from "../epoch-builder";






// Service
export interface IPredictionService {
    // Properties
    active: BehaviorSubject<IPrediction|undefined>,
    activeState: IPredictionState,
    activeStateIntesity: IPredictionStateIntesity,

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
    listMinifiedPredictions(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<Partial<IPrediction>[]>,

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
    buildCandlestick(preds: Partial<IPrediction>[]): IPredictionCandlestick,
    getPredictionCandlestickCloseTime(ot: number): number,
}




/**
 * Prediction Request Body
 * The body sent to the Prediction API in order to generate a prediction.
 */
export interface IPredictionRequestBody {
    // The identifier of the Epoch
    epoch_id: string,

    // The current state of the prediction
    trend_state: IPredictionState,

    // The intensity of the state
    trend_state_intensity: IPredictionStateIntesity,

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
    sm: number                  // Sum Mean
}



/**
 * Prediction State
 * The state of the prediction stands for the trend being followed by the
 * last 5 hours worth of candlesticks. The states are the following:
 * 1) Flat: there isn't a clear trend being followed and is represented by a 0.
 * 2) Up: there is an increase trend and is be represented by an int from 1 to 12.
 * 3) Down: there is a decrease trend and is be represented by an int from -1 to -12.
 * The number represents the number of candlesticks backing the trend. The higher, 
 * the more intense.
 */
export type IPredictionState = 12|11|10|9|8|7|6|5|4|3|2|1|0|-1|-2|-3|-4|-5|-6|-7|-8|-9|-10|-11|-12;



/**
 * Prediction State Intensity
 * The intensity of the direction the trend sum is taking.
 */
export type IPredictionStateIntesity = -2|-1|0|1|2;




/**
 * Prediction State Result
 * The state and the intensity are calculated in order accordingly.
 */
export interface IPredictionStateResult {
    state: IPredictionState,
    intensity: IPredictionStateIntesity
}