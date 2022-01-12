import { ICandlestick } from "../candlestick";





/* Services */



// Forecast Service
export interface IForecastService {
    forecast(
        startTimestamp: number,
        endTimestamp: number,
        fConfig?: IForecastConfig,
        kzConfig?: IKeyZonesConfig,
    ): Promise<IForecastResult>
}




// Key Zones Service
export interface IKeyZonesService {
    getState(candlesticks: ICandlestick[], candlesticks1m: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState,
    getZonesFromPrice(price: number, kz: IKeyZone[], above: boolean): IKeyZone[],
    zoneMutated(reversals: IReversal[]): boolean
}






/* Config */
export interface IConfig { verbose?: number }

export interface IForecastConfig extends IConfig {
    priceActionCandlesticksRequirement?: number,
    includeCandlesticksInResponse?: boolean,
    strategy?: IStrategyID
}

export interface IKeyZonesConfig extends IConfig {
    zoneSize?: number,
    zoneMergeDistanceLimit?: number
}






/* Key Zones State */
export interface IKeyZonesState {
    // Close price of the last candlestick
    p: number,

    // Key Zones
    kz: IKeyZone[],

    // Active Key Zone
    akz: IKeyZone|undefined,

    // Touch Action
    tr: boolean,    // Touched Resistance
    ts: boolean,    // Touched Support
}






/* Key Zones */
export interface IKeyZonePriceRange {
    s: number,  // Start Price (Highest High or Lowest Low)
    e: number,  // End Price (+/- zoneSize% from start price)
}

export interface IKeyZone extends IKeyZonePriceRange {
    id: number,         // Candlestick Open Timestamp
    r: IReversal[],     // Reversals: List of reversals that took place at the zone, ordered by date ascending
    v: number,          // Volume: The accumulated volume within the key zone
} 








/**
 * Reversals
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 */
export interface IReversal {
    id: number,         // Candlestick Open Timestamp
    t: IReversalType    // Type of Reversal
}

export type IReversalType = 'r'|'s'; // r = Resistance | s = Support








/**
 * Price actions
 * 
 */

export interface IPriceActionData {
    touchedSupport: boolean,
    touchedResistance: boolean,
    currentZone: IKeyZone|undefined
}







/* Strategy */

export interface IStrategy {
    // Reversals
    minReversals: number, 

    // Reversal Types
    respectReversalType?: boolean,
    allowMutations?: boolean,

    // Next Key Zone Reversal - Must be one or the other as they counter each other
    moreReversalsThanNext?: boolean,
    actOnLessReversalsThanNext?: boolean,

    // Next Key Zone Volume - Must be one or the other as they counter each other
    moreVolumeThanNext?: boolean,
    actOnLessVolumeThanNext?: boolean,

    // 
    followPrice?: boolean,
}


export type IStrategyID = 
// Follow Price
'FP'|

// Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | Act on Less Volume Than Next
'T_1R_RTM_AOLVTN'|

// Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | More Volume Than Next
'T_1R_RTM_MVTN'|

// Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | Act on Less Reversals Than Next
'T_1R_RTM_AOLRTN'|'T_2R_RTM_AOLRTN'|'T_3R_RTM_AOLRTN'|'T_4R_RTM_AOLRTN'|'T_5R_RTM_AOLRTN'|

// Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | More Reversals Than Next
'T_1R_RTM_MRTN'|'T_2R_RTM_MRTN'|'T_3R_RTM_MRTN'|'T_4R_RTM_MRTN'|'T_5R_RTM_MRTN'|

// Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations
'T_1R_RTM'|'T_2R_RTM'|'T_3R_RTM'|'T_4R_RTM'|'T_5R_RTM'|

// Touch With Minimum Reversals | Respecting Reversal Type
'T_1R_RT'|'T_2R_RT'|'T_3R_RT'|'T_4R_RT'|'T_5R_RT'|

// Touch With Minimum Reversals
'T_1R'|'T_2R'|'T_3R'|'T_4R'|'T_5R';








/* Forecast Result */



// Forecast Result
export interface IForecastResult {
    start: number,                  // First Candlestick's Open Time
    end: number,                    // Last Candlestick's Close Time
    result: ITendencyForecast,
    state: IKeyZonesState,
    candlesticks?: ICandlestick[]   // Only exists if includeCandlesticksInResponse is set to true
}






// Tendency
export type ITendencyForecast = 1|0|-1;