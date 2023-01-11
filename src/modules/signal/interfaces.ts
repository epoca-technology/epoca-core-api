import { BehaviorSubject } from "rxjs";
import { IPredictionResult } from "../epoch-builder";
import { IStateType } from "../market-state";




// Service
export interface ISignalService {
    // Properties
    active: BehaviorSubject<IPredictionResult>,
    policies: IPredictionCancellationPolicies,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Prediction Cancellation Policies Management
    updatePolicies(newPolicies: IPredictionCancellationPolicies): Promise<void>
}







/**
 * Prediction Cancellation Policy
 * When a non-neutral prediction is generated, it is evaluated against
 * the cancellation policy. If they are all met, the prediction is
 * neutralized. Otherwise, it is maintained and broadcasted.
 * 
 * The cancellation policy makes use of the State Type. If 0 is provided
 * for an item, it will be ignored. Furthermore, if a 1 is provided and
 * the current state is 2 it will be counted. Same applies for -2 and -1.
 */
export interface IPredictionCancellationPolicy {
    // Technical Analysis
    ta_30m: IStateType,
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,

    // Market State
    window: IStateType,
    volume: IStateType,
    network_fee: IStateType,
    open_interest: IStateType,
    long_short_ratio: IStateType,
}



/**
 * Cancellation Policies
 * Long and Short predictions can have tailored policies in order 
 * increase the accuracy of the model as much as possible.
 */
export interface IPredictionCancellationPolicies {
    LONG: IPredictionCancellationPolicy,
    SHORT: IPredictionCancellationPolicy
}