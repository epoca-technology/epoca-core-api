import { BehaviorSubject } from "rxjs";
import { IBinancePositionSide } from "../binance";
import { IPredictionResult } from "../epoch-builder";
import { IMarketState, IStateType } from "../market-state";
import { IPredictionState, IPredictionStateIntesity } from "../prediction";




// Service
export interface ISignalService {
    // Properties
    active: BehaviorSubject<IPredictionResult>,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getPolicies(side: IBinancePositionSide): ISignalSidePolicies
}









/************************************************************************************
 * Issuance Policies                                                                *
 * The prediction model natively generates non-neutral signals. Furthermore,        *
 * the prediction state and intensity combined with other market state components   *
 * can only generate non-neutral signals.                                           *
 ************************************************************************************/
export interface IIssuancePolicy {
    // The trend state and intensity required for it to trigger
    trend_state: IPredictionState,
    trend_intensity: IPredictionStateIntesity
}


/**
 * Technicals Issuance
 * Triggers when the trend and all technicals align.
 */
export interface ITechnicalsIssuance extends IIssuancePolicy {
    ta_30m: IStateType,
    ta_1h: IStateType,
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType
}


/**
 * Technicals Open Interest Issuance
 * Triggers when the trend, some technicals and the open interest align.
 */
export interface ITechnicalsOpenInterestIssuance extends IIssuancePolicy {
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
    open_interest: IStateType
}


/**
 * Technicals Long Short Ratio Issuance
 * Triggers when the trend, some technicals and the long/short ratio align.
 */
export interface ITechnicalsLongShortRatioIssuance extends IIssuancePolicy {
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
    long_short_ratio: IStateType
}


/**
 * Open Interest Long/Short Ratio Issuance
 * Triggers when the trend, the open interest and the long/short ratio align.
 */
export interface IOpenInterestLongShortRatioIssuance extends IIssuancePolicy {
    open_interest: IStateType,
    long_short_ratio: IStateType
}



/**
 * Issuance Policies
 * The object that packs all the issuance policies into a single argument.
 */
export interface IIssuancePolicies {
    technicals: ITechnicalsIssuance,
    technicals_open_interest: ITechnicalsOpenInterestIssuance,
    technicals_long_short_ratio: ITechnicalsLongShortRatioIssuance,
    open_interest_long_short_ratio: IOpenInterestLongShortRatioIssuance,
}







/***********************************************************************
 * Cancellation Policies                                               *
 * Any non-neutral signal can be cancelled if any of the cancellation  *
 * policies is met.                                                    *
 ***********************************************************************/
export interface ICancellationPolicy {

}



/**
 * Window Cancellation
 * Triggers when the market has already moved significantly in favor of
 * the signal type.
 */
export interface IWindowCancellation extends ICancellationPolicy {
    window: IStateType
}




/**
 * Technicals Cancellation
 * Triggers when the technical analysis indicators are all against the
 * signal type.
 */
export interface ITechnicalsCancellation extends ICancellationPolicy {
    ta_30m: IStateType,
    ta_1h: IStateType,
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType
}



/**
 * Technicals Open Interest Cancellation
 * Triggers when some technical analysis indicators and the open interest
 * are against the signal type.
 */
export interface ITechnicalsOpenInterestCancellation extends ICancellationPolicy {
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
    open_interest: IStateType
}




/**
 * Technicals Long/Short Cancellation
 * Triggers when some technical analysis indicators and the long/short ratio
 * are against the signal type.
 */
export interface ITechnicalsLongShortRatioCancellation extends ICancellationPolicy {
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
    long_short_ratio: IStateType
}




/**
 * Open Interest Long/Short Cancellation
 * Triggers when the open interest and the long/short ratio are against the 
 * signal type.
 */
export interface IOpenInterestLongShortRatioCancellation extends ICancellationPolicy {
    open_interest: IStateType,
    long_short_ratio: IStateType
}




/**
 * Cancellation Policies
 * The object that packs all the cancellation policies into a single argument.
 */
export interface ICancellationPolicies {
    window: IWindowCancellation,
    technicals: ITechnicalsCancellation,
    technicals_open_interest: ITechnicalsOpenInterestCancellation,
    technicals_long_short_ratio: ITechnicalsLongShortRatioCancellation,
    open_interest_long_short_ratio: IOpenInterestLongShortRatioCancellation
}













/**********************************************************************
 * Signal Side Policies                                               *
 * The object that wraps all the issuance and cancellation policies.  *
 **********************************************************************/
export interface ISignalSidePolicies {
    issuance: IIssuancePolicies,
    cancellation: ICancellationPolicies
}











/******************************************************************
 * Signal Dataset                                                 *
 * In order for the system to generate non-neutral signals, a     *
 * dataset containing all required data must be built every time  *
 * a new prediction is generated.                                 *
 ******************************************************************/
export interface ISignalDataset {
    // The result of the latest prediction
    result: IPredictionResult,

    // The current trend state and intensity
    trendState: IPredictionState,
    trendStateIntensity: IPredictionStateIntesity,

    // The current market state
    marketState: IMarketState
}