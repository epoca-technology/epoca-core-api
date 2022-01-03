import { ICandlestick } from "../candlestick";





/* Services */



// Forecast Service
export interface IForecastService {
    forecast(
        candlesticks1m?: ICandlestick[],
        startTimestamp?: number,
        endTimestamp?: number,
        fConfig?: IForecastConfig,
        kzConfig?: IKeyZonesConfig,
    ): Promise<IForecastResult>
}




// Key Zones Service
export interface IKeyZonesService {
    getState(candlesticks: ICandlestick[], candlesticks1m: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState
}






/* Config */
export interface IConfig { verbose?: number }

export interface IForecastConfig extends IConfig {
    intervalMinutes?: number,
    includeCandlesticksInResponse?: boolean,
}

export interface IKeyZonesConfig extends IConfig {
    zoneSize?: number,
    zoneMergeDistanceLimit?: number
}









/* Key Zones State */
export interface IKeyZonesState {
    // Close price of the last candlestick
    price: number,

    // Key Zones
    zones: IKeyZone[],
    zonesAbove: IKeyZone[],
    zonesBelow: IKeyZone[],

    // Price Action History
    actions: IPriceAction[],

    // Resistance
    resistanceDominance: number,
    touchedResistance: boolean,
    brokeResistance: boolean,

    // Support
    supportDominance: number,
    touchedSupport: boolean,
    brokeSupport: boolean,
}




/* Key Zones Data */
export interface IKeyZonesData {
    keyZones: IKeyZone[],
    actions: IPriceAction[]
}



/* Key Zones */
export interface IKeyZonePriceRange {
    start: number,                  // Start Price (Highest High or Lowest Low)
    end: number,                    // End Price (+/- zoneSize% from start price)
}

export interface IKeyZone extends IKeyZonePriceRange {
    id: number,                     // Candlestick Open Timestamp
    reversals: IReversal[],         // List of reversals that took place at the zone, ordered by date ascending
    volume: number,                 // The accumulated volume that has been processed within the zone
    volumeScore: number,            // Score from 0 to 10 based on the volume traded
    mutated: boolean,               // Changed it's type from resistance to support or viceversa
    action: IKeyZonePriceAction,    // The action that took place in the key zone
} 








/**
 * Reversals
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 */
export interface IReversal {
    id: number,                     // Candlestick Open Timestamp
    type: IReversalType
}

export type IReversalType = 'resistance'|'support';








/**
 * Price actions
 * 
 */
export interface IKeyZonePriceAction {
    touched: number,
    broke: number
}

export interface IPriceAction {
    id: number,                     // 1 Minute Candlestick Close Time
    type: IPriceActionType,         // Type of action that took place
    zone: IKeyZone,                 // The Key Zone in which the action took place
    price: number,                  // 1 Minute Candlestick Close Price that triggered the action
}

export type IPriceActionType = 'touched-support'|'broke-support'|'touched-resistance'|'broke-resistance';


export interface IPriceActionData {
    keyZoneAction: IKeyZonePriceAction, 
    action: IPriceAction[]
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