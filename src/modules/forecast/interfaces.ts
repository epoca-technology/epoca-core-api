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
    getState(candlesticks1m: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState
}






/* Config */
export interface IConfig { verbose?: number }

export interface IForecastConfig extends IConfig {
    intervalMinutes?: number,
    includeCandlesticksInResponse?: boolean,
}

export interface IKeyZonesConfig extends IConfig {
    zoneSize?: number,
    reversalCountRequirement?: number,
}









/* Key Zones State */
export interface IKeyZonesState {
    // Close price of the last candlestick
    price: number,

    // Percentage of takers that are buying
    takerBuyVolumePercent: number,

    // Key Zones
    zones: IKeyZone[],
    zonesAbove: IKeyZone[],
    zonesBelow: IKeyZone[],

    // Resistance
    touchedResistance: boolean,
    brokeResistance: boolean,

    // Support
    touchedSupport: boolean,
    brokeSupport: boolean,
}



/* Key Zones */
export interface IKeyZonePriceRange {
    start: number,                  // Start Price (Highest High or Lowest Low)
    end: number,                    // End Price (+/- zoneSize% from start price)
}

export interface IKeyZone extends IKeyZonePriceRange {
    id: number,                     // Candlestick Open Timestamp
    reversalCount: number,          // Number of times the price has reversed from this point
    reversalType: IReversalType,    // Type of reversal that took place at the zone
}

/**
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 * Mutated: The type of reverse has changed its type. From support to resistance or vice versa
 */
export type IReversalType = 'resistance'|'support'|'mutated';











/* Forecast Result */



// Forecast Result
export interface IForecastResult {
    result: ITendencyForecast,
    keyZonesState: IKeyZonesState,
    candlesticks?: ICandlestick[] // Only exists if includeCandlesticksInResponse is set to true
}






// Tendency
export type ITendencyForecast = 1|0|-1;