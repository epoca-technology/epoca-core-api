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
    getZonesFromPrice(price: number, kz: IKeyZone[], above: boolean): IKeyZone[]
}






/* Config */
export interface IConfig { verbose?: number }

export interface IForecastConfig extends IConfig {
    priceActionCandlesticksRequirement?: number,
    includeCandlesticksInResponse?: boolean,
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

    // Active & Key Zone
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
    m: boolean,         // Mutated: Changed it's type from resistance to support or viceversa
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