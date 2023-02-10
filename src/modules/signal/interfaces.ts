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

    // Signal Policies Management
    getPolicies(side: IBinancePositionSide): ISignalSidePolicies,
    updatePolicies(side: IBinancePositionSide, newPolicies: ISignalSidePolicies): Promise<void>
}



// Validations
export interface ISignalValidations {
    validateSide(side: IBinancePositionSide): void,
    canSidePoliciesBeUpdated(side: IBinancePositionSide, newPolicies: ISignalSidePolicies): void
}



// Model
export interface ISignalModel {
    getPolicies(): Promise<ISignalPolicies|undefined>,
    createPolicies(policies: ISignalPolicies): Promise<void>,
    updatePolicies(policies: ISignalPolicies): Promise<void>
}








/************************************************************************************
 * Issuance Policies                                                                *
 * The prediction model natively generates non-neutral signals. Furthermore,        *
 * the prediction state and intensity combined with other market state components   *
 * can only generate non-neutral signals.                                           *
 ************************************************************************************/
export type ITrendSumState = -1|0|1;
export interface IIssuancePolicy {
    // The status of the policy - If disabled, the policy won't be evaluated
    enabled: boolean, 

    /**
     * The trend sum, state and intensity required for it to trigger.
     * The sum is represented as follows:
     * -1: < 0
     *  0: Any Trend Sum
     *  1: > 0
     */
    trend_sum: ITrendSumState,
    trend_state: IPredictionState,
    trend_intensity: IPredictionStateIntesity
}



/* Individual Issuance */


/**
 * Volume Issuance
 * Triggers when the volume drives the price towards a clear direction.
 */
export interface IVolumeIssuance extends IIssuancePolicy {
    volume: IStateType,
    volume_direction: IStateType
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
 * Open Interest Issuance
 * Triggers when the trend and the open interest align.
 */
export interface IOpenInterestIssuance extends IIssuancePolicy {
    open_interest: IStateType
}



/**
 * Long Short Ratio Issuance
 * Triggers when the trend and the long/short ratio align.
 */
export interface ILongShortRatioIssuance extends IIssuancePolicy {
    long_short_ratio: IStateType
}




/* Volume Combination Issuance */



/**
 * Volume Technicals Issuance
 * Triggers when the volume drives the price towards a clear direction aligned
 * with technicals.
 */
export interface IVolumeTechnicalsIssuance extends IIssuancePolicy {
    volume: IStateType,
    volume_direction: IStateType,
    ta_30m: IStateType,
    ta_1h: IStateType,
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
}



/**
 * Volume Open Interest Issuance
 * Triggers when the volume drives the price towards a clear direction aligned
 * with the open interest.
 */
export interface IVolumeOpenInterestIssuance extends IIssuancePolicy {
    volume: IStateType,
    volume_direction: IStateType,
    open_interest: IStateType
}


/**
 * Volume Long/Short Ratio Issuance
 * Triggers when the volume drives the price towards a clear direction aligned
 * with the long/short ratio.
 */
export interface IVolumeLongShortRatioIssuance extends IIssuancePolicy {
    volume: IStateType,
    volume_direction: IStateType,
    long_short_ratio: IStateType
}





/* Technicals Combination Issuance */


/**
 * Technicals Open Interest Issuance
 * Triggers when the trend, some technicals and the open interest align.
 */
export interface ITechnicalsOpenInterestIssuance extends IIssuancePolicy {
    ta_30m: IStateType,
    ta_1h: IStateType,
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
    ta_30m: IStateType,
    ta_1h: IStateType,
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
    volume: IVolumeIssuance,
    technicals: ITechnicalsIssuance,
    open_interest: IOpenInterestIssuance,
    long_short_ratio: ILongShortRatioIssuance,
    volume_technicals: IVolumeTechnicalsIssuance,
    volume_open_interest: IVolumeOpenInterestIssuance,
    volume_long_short_ratio: IVolumeLongShortRatioIssuance,
    technicals_open_interest: ITechnicalsOpenInterestIssuance,
    technicals_long_short_ratio: ITechnicalsLongShortRatioIssuance,
    open_interest_long_short_ratio: IOpenInterestLongShortRatioIssuance,
}

export type IIssuanceBasedPolicy = 
IVolumeIssuance|ITechnicalsIssuance|IOpenInterestIssuance|ILongShortRatioIssuance|
IVolumeTechnicalsIssuance|IVolumeOpenInterestIssuance|IVolumeLongShortRatioIssuance|
ITechnicalsOpenInterestIssuance|ITechnicalsLongShortRatioIssuance|IOpenInterestLongShortRatioIssuance;

export type IIssuancePolicyNames = 
"volume"|"technicals"|"open_interest"|"long_short_ratio"|
"volume_technicals"|"volume_open_interest"|"volume_long_short_ratio"|
"technicals_open_interest"|"technicals_long_short_ratio"|
"open_interest_long_short_ratio";

export type IVolumeBasedIssuancePolicy = 
IVolumeIssuance|IVolumeTechnicalsIssuance|IVolumeOpenInterestIssuance|IVolumeOpenInterestIssuance;

export type ITechnicalsBasedIssuancePolicy = 
ITechnicalsIssuance|IVolumeTechnicalsIssuance|ITechnicalsOpenInterestIssuance|ITechnicalsLongShortRatioIssuance;








/***********************************************************************
 * Cancellation Policies                                               *
 * Any non-neutral signal can be cancelled if any of the cancellation  *
 * policies is met.                                                    *
 ***********************************************************************/
export interface ICancellationPolicy {
    // The status of the policy - If disabled, the policy won't be evaluated
    enabled: boolean, 

}



/* Individual Cancellation */


/**
 * Window Cancellation
 * Triggers when the market has already moved significantly in favor of
 * the signal type.
 */
export interface IWindowCancellation extends ICancellationPolicy {
    window: IStateType
}




/**
 * Volume Cancellation
 * Triggers when the volume is increasing, driving the price in the signal's 
 * opposite direction.
 */
export interface IVolumeCancellation extends ICancellationPolicy {
    volume: IStateType,
    volume_direction: IStateType
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
 * Open Interest Cancellation
 * Triggers when the open interest is against the signal type.
 */
export interface IOpenInterestCancellation extends ICancellationPolicy {
    open_interest: IStateType
}




/**
 * Long/Short Cancellation
 * Triggers when the long/short ratio is against the signal type.
 */
export interface ILongShortRatioCancellation extends ICancellationPolicy {
    long_short_ratio: IStateType
}









/* Volume Combination Cancellation */





/**
 * Volume Technicals Cancellation
 * Triggers when the volume is increasing, driving the price in the signal's 
 * opposite direction and technicals are also against it.
 */
export interface IVolumeTechnicalsCancellation extends ICancellationPolicy {
    volume: IStateType,
    volume_direction: IStateType,
    ta_30m: IStateType,
    ta_1h: IStateType,
    ta_2h: IStateType,
    ta_4h: IStateType,
    ta_1d: IStateType,
}



/**
 * Volume Open Interest Cancellation
 * Triggers when the volume is increasing, driving the price in the signal's 
 * opposite direction as well as the open interest.
 */
export interface IVolumeOpenInterestCancellation extends ICancellationPolicy {
    volume: IStateType,
    volume_direction: IStateType,
    open_interest: IStateType
}


/**
 * Volume Long/Short Ratio Cancellation
 * Triggers when the volume is increasing, driving the price in the signal's 
 * opposite direction as well as the long/short ratio.
 */
export interface IVolumeLongShortRatioCancellation extends ICancellationPolicy {
    volume: IStateType,
    volume_direction: IStateType,
    long_short_ratio: IStateType
}







/* Technicals Combination Cancellation */



/**
 * Technicals Open Interest Cancellation
 * Triggers when some technical analysis indicators and the open interest
 * are against the signal type.
 */
export interface ITechnicalsOpenInterestCancellation extends ICancellationPolicy {
    ta_30m: IStateType,
    ta_1h: IStateType,
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
    ta_30m: IStateType,
    ta_1h: IStateType,
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
    volume: IVolumeCancellation,
    technicals: ITechnicalsCancellation,
    open_interest: IOpenInterestCancellation,
    long_short_ratio: ILongShortRatioCancellation,
    volume_technicals: IVolumeTechnicalsCancellation,
    volume_open_interest: IVolumeOpenInterestCancellation,
    volume_long_short_ratio: IVolumeLongShortRatioCancellation,
    technicals_open_interest: ITechnicalsOpenInterestCancellation,
    technicals_long_short_ratio: ITechnicalsLongShortRatioCancellation,
    open_interest_long_short_ratio: IOpenInterestLongShortRatioCancellation
}

export type ICancellationBasedPolicy = 
IWindowCancellation|IVolumeCancellation|ITechnicalsCancellation|IOpenInterestCancellation|ILongShortRatioCancellation|
IVolumeTechnicalsCancellation|IVolumeOpenInterestCancellation|IVolumeLongShortRatioCancellation|
ITechnicalsOpenInterestCancellation|ITechnicalsLongShortRatioCancellation|
IOpenInterestLongShortRatioCancellation;

export type ICancellationPolicyNames = 
"window"|"volume"|"technicals"|"open_interest"|"long_short_ratio"|
"volume_technicals"|"volume_open_interest"|"volume_long_short_ratio"|
"technicals_open_interest"|"technicals_long_short_ratio"|
"open_interest_long_short_ratio";


export type IVolumeBasedCancellationPolicy = 
IVolumeCancellation|IVolumeTechnicalsCancellation|IVolumeOpenInterestCancellation|IVolumeOpenInterestCancellation;

export type ITechnicalsBasedCancellationPolicy = 
ITechnicalsCancellation|IVolumeTechnicalsCancellation|ITechnicalsOpenInterestCancellation|ITechnicalsLongShortRatioCancellation;












/**********************************************************************
 * Signal Side Policies                                               *
 * The object that wraps all the issuance and cancellation policies.  *
 **********************************************************************/
export interface ISignalSidePolicies {
    issuance: IIssuancePolicies,
    cancellation: ICancellationPolicies
}





/*************************************************************************
 * Signal Policies                                                       *
 * Both sides' policies are stored in the database under the long/short  *
 * keys and are always updated together.                                 *
 *************************************************************************/
export interface ISignalPolicies {
    long: ISignalSidePolicies,
    short: ISignalSidePolicies
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

    // The current trend sum, state and intensity
    trendSum: number,
    trendState: IPredictionState,
    trendStateIntensity: IPredictionStateIntesity,

    // The current market state
    marketState: IMarketState
}