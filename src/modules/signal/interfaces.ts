import { BehaviorSubject } from "rxjs";
import { IPredictionResult } from "../epoch-builder";
import { IMarketState } from "../market-state";
import { IPredictionState, IPredictionStateIntesity } from "../prediction";




// Service
export interface ISignalService {
    // Properties
    active: BehaviorSubject<IPredictionResult>,

    // Initializer
    initialize(): Promise<void>,
    stop(): void
}







/**
 * Signal Dataset
 * In order for the system to generate non-neutral signals, a
 * dataset containing all required data must be built every time
 * a new prediction is generated.
 */
export interface ISignalDataset {
    // The result of the latest prediction
    result: IPredictionResult,

    // The current trend state and intensity
    trendState: IPredictionState,
    trendStateIntensity: IPredictionStateIntesity,

    // The current market state
    marketState: IMarketState
}