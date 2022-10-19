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
        endAt: number,
        limit: number
    ): Promise<IPrediction[]>,
    
    // Initializer
    initialize(): Promise<void>,
    stop(): void
}




// Validations
export interface IPredictionValidations {
    // Retrievers
    validateActivePrediction(pred: IPrediction|undefined): void,
    canListPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined,
        limit: number|undefined, 
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
        endAt: number|undefined,
        limit: number|undefined
    ): Promise<IPrediction[]>,

    // Prediction Saving
    savePrediction(epochID: string, pred: IPrediction): Promise<void>
}


