import { BehaviorSubject } from "rxjs";
import { ICandlestick } from "../candlestick";



/**
 * Market State Service
 * This service handles the wrapping of all the submodules into an unified output.
 */
export interface IMarketStateService {
    // Properties
    active: BehaviorSubject<IMarketState>,

    // Initializer
    initialize(): Promise<void>,
    stop(): void
}





/**
 * State Utilities Service
 * Provides a series of functionalities that simplify state calculations.
 */
export interface IStateUtilitiesService {
    calculateCurrentState(
        series: ICandlestick[]|ISplitStateSeriesItem[],
        requirement: number,
        strongRequirement: number
    ): { averageState: IStateType, splitStates: ISplitStates }
    calculateAverageState(states: IStateType[]): IStateType
}

















/*********
 * STATE *
 *********/



/**
 * State Type
 * All market state modules can be stateful or stateless and are update constantly.
 * There are 2 kinds of modules within the Market State. There are those that rely
 * on a sequence of values and the state is calculated based on the percentage change
 * between the beginning and the end of the window (per split). On the other hand, there are
 * other modules which don't rely on a sequence but instead the result of a series
 * of calculations.
 */
export type IStateType = -2|-1|0|1|2;
















/****************
 * Split States *
 ****************/





/**
 * Split States
 * In order to better analyze the state of a series of data items, the sequence
 * is split into different ranges, focusing more on the latest items.
 */

// Identifiers
export type ISplitStateID = "s100"|"s75"|"s50"|"s25"|"s15"|"s10"|"s5"|"s2";

// The state can be calculated based on a series of items or candlesticks
export interface ISplitStateSeriesItem {
    x: number,
    y: number
}

// The result of a split state
export interface ISplitStateResult {
    // The state of the item
    s: IStateType,

    // The percentual change in the split
    c: number
}

// Full object containing all the split states & payloads
export interface ISplitStates {
    s100: ISplitStateResult,  // 100%
    s75: ISplitStateResult,   // 75%
    s50: ISplitStateResult,   // 50%
    s25: ISplitStateResult,   // 25%
    s15: ISplitStateResult,   // 15%
    s10: ISplitStateResult,   // 10%
    s5: ISplitStateResult,    // 5%
    s2: ISplitStateResult,    // 2%
}

// Minified split states containing only the state results
export interface IMinifiedSplitStates {
    s100: IStateType,
    s75: IStateType,
    s50: IStateType,
    s25: IStateType,
    s15: IStateType,
    s10: IStateType,
    s5: IStateType,
    s2: IStateType
}






















/****************************************************************************
 * WINDOW STATE                                                             *
 * The purpose of the window state is to enable programatic understanding   *
 * of the current price based on a given window.                            *
 ****************************************************************************/


// Service
export interface IWindowStateService {
    calculateState(window: ICandlestick[]): IWindowState,
    getDefaultState(): IWindowState,
}

// State Object
export interface IWindowState {
    // The state of the window
    s: IStateType,

    // The split states payload
    ss: ISplitStates,

    // The candlesticks that comprise the window
    w: ICandlestick[]
}




















/****************************************************************************
 * VOLUME STATE                                                             *
 * The purpose of the volume state is to enable programatic understanding   *
 * of the volume based on the current value.                                *
 ****************************************************************************/


// Service
export interface IVolumeStateService {
    state: IVolumeState,
    calculateState(window: ICandlestick[]): IStateType
    getDefaultState(): IStateType,
}


// Full State
export interface IVolumeState {
    // The state of the volume
    s: IStateType,

    // The mean and mean high used to determine the state of the volume
    m: number,
    mh: number,

    // The list of volumes that comprise the window
    w: ISplitStateSeriesItem[]
}



























/*****************************************************************************
 * KEYZONES STATE                                                            *
 * The purpose of the keyzones state is to enable programatic understanding  *
 * of nearby supports and resistances for building more efficient strategies *
 *****************************************************************************/


// Service
export interface IKeyZonesStateService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    calculateState(fullState?: boolean): IKeyZoneState|IKeyZoneFullState,
    getDefaultState(): IKeyZoneState,
}



/**
 * Reversal Type
 * A reversal can be of 2 kinds:
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 */
export type IReversalType = "r"|"s"; // r = Resistance | s = Support


/**
 * Volume Intensity
 * The intensity of the volume within the KeyZone.
 */
export type IKeyZoneVolumeIntensity = 0|1|2;


/**
 * Reversal
 * A series of reversals are detected based on the daily candlesticks and then
 * included into a "KeyZone".
 */
export interface IReversal {
    id: number, // The open time of the candlestick in which the reversal was detected
    t: IReversalType,
    v: number
}



/**
 * KeyZone Price Range
 * The price range that comprises a KeyZone.
 */
export interface IKeyZonePriceRange {
    s: number,  // Start Price (Highest High or Lowest Low)
    e: number   // End Price (+/- zone_size% from start price)
}


/**
 * KeyZone
 * A keyzone is a price range in which the price will likely reverse.
 */
export interface IMinifiedKeyZone extends IKeyZonePriceRange { 
    vi: IKeyZoneVolumeIntensity
}
export interface IKeyZone extends IKeyZonePriceRange {
    // The date in which the keyzone was first detected
    id: number,

    // List of reversals that took place at the zone, ordered by date ascending
    r: IReversal[],

    // A KeyZone is considered to have mutated when it has reversed in both ways
    m: boolean,

    // The volume mean and intensity
    vm: number,
    vi: IKeyZoneVolumeIntensity
}



/**
 * KeyZone State
 * A state can be generated by providing the latest price. It will check if the price
 * is in a zone and return the zones nearby.
 */
export interface IKeyZoneState {
    // The keyzone the price is in (if any)
    active: IMinifiedKeyZone|null,

    // The list of keyzones above the current price
    above: IMinifiedKeyZone[],

    // The list of keyzones below the current price
    below: IMinifiedKeyZone[],
}



/**
 * KeyZone Full State
 * An object containing the full KeyZone State. Can only be obtained through the
 * market state route. 
 */
export interface IKeyZoneFullState {
    // The keyzone the price is in (if any)
    active: IKeyZone|null,

    // The list of keyzones above the current price
    above: IKeyZone[],

    // The list of keyzones below the current price
    below: IKeyZone[],

    // The mean of all the keyzone volumes
    volume_mean: number,

    // The timestamp in which the build was generated
    build_ts: number
}























/********************************************************************************
 * LIQUIDITY STATE                                                              *
 * The purpose of the liquidity state submodule is to have a deep understanding *
 * of the order book, identify levels at which there are liquidity peaks and be *
 * able to determine the market's direction (sentiment?)                        *
 ********************************************************************************/

// Service
export interface ILiquidityStateService {
    // Properties
    state: ILiquidityState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    calculateState(currentPrice: number): IMinifiedLiquidityState,
    getAsks(currentPrice: number): ILiquidityPriceLevel[],
    getBids(currentPrice: number): ILiquidityPriceLevel[],

    // Misc Helpers
    getDefaultState(): IMinifiedLiquidityState,
}





/**
 * Liquidity Intensity
 * The intensity of the liquidity within a price level.
 */
export type ILiquidityIntensity = 0|1|2|3;


/**
 * Liquidity Side
 * The order book is comprised by asks (Sell Orders) and bids (Buy Orders).
 * Asks are ordered by price from low to high while bids from high to low.
 */
export type ILiquiditySide = "asks"|"bids";


/**
 * Liquidity Intensity Requirements
 * For a price level to have intensity, it needs to be greater than or equals than
 * the requirements. Otherwise, the intensity will be 0.
 */
export interface ILiquidityIntensityRequirements {
    // Low Requirement
    l: number,

    // Medium Requirement
    m: number,

    // High Requirement
    h: number
}




/**
 * Liquidity Price Level
 * The record containing all relevant information regarding a price level.
 */
export interface ILiquidityPriceLevel {
    // The level's price
    p: number,

    // The BTC liquidity within the level
    l: number,

    // The intensity of the liquidity within the level
    li: ILiquidityIntensity
}




/**
 * Minified Liquidity Price Level
 * The minified price level object that is inserted into the App Bulk.
 */
export interface IMinifiedLiquidityPriceLevel {
    // The level's price
    p: number,

    // The intensity of the liquidity within the level
    li: ILiquidityIntensity
}



/**
 * Liquidity Side Build
 * When the order book is retrieved in a raw format, it is processed and
 * each side is analyzed.
 */
export interface ILiquiditySideBuild {
    // The total liquidity accumulated in all levels
    total: number,

    // The requirements derived from the highest liquidity recorded in a price level
    requirements: ILiquidityIntensityRequirements,

    // The list of price levels
    levels: ILiquidityPriceLevel[]
}




/**
 * Liquidity State
 * The full state of the liquidity. This object can be queried through the endpoint.
 */
export interface ILiquidityState {
    /**
     * The direction of the liquidity. If there are more bids than asks, the direction
     * will be 1 or 2. On the contrary, if there are more asks than bids, the direction
     * will be -1 or -2. Additionally, the direction can be 0 if the difference between
     * the bids and the asks is insignificant.
     */
    d: IStateType,

    // The total liquidity accumulated by the bids and the asks.
    al: number, // Asks Liquidity
    bl: number, // Bids Liquidity

    /**
     * The bid & ask intensity requirements. For a price level to have an intensity,
     * it must meet at least one of levels.
     */
    air: ILiquidityIntensityRequirements, // Ask Intensity Requirements
    bir: ILiquidityIntensityRequirements, // Bid Intensity Requirements

    // The liquidity price levels for bids and asks ordered accordingly
    a: ILiquidityPriceLevel[], // Asks
    b: ILiquidityPriceLevel[], // Bids

    // The timestamp in ms in which the liquidity state was last updated
    ts: number
}




/**
 * Minified Liquidity State
 * The optimized version of the liquidity state. Keep in mind that only price levels
 * with intensity are included in this object.
 */
export interface IMinifiedLiquidityState {
    // The direction of the liquidity.
    d: IStateType,

    // The liquidity price levels for bids and asks ordered accordingly
    a: IMinifiedLiquidityPriceLevel[], // Asks
    b: IMinifiedLiquidityPriceLevel[], // Bids
}



















/********************************************************************************
 * TREND STATE                                                                  *
 * The purpose of the trend state submodule is to have a deep understanding of  *
 * the direction being taken by the trend generated by the PredictionModel. If  *
 * no Epoch is active, the trend state will use its defaults.                   *
 ********************************************************************************/

// Service
export interface ITrendStateService {
    state: ITrendState,
    initialize(): Promise<void>,
    stop(): void,
    getDefaultState(): ITrendState,
}

// State Object
export interface ITrendState {
    // The state of the trend
    s: IStateType,

    // The split states payload
    ss: ISplitStates
}


















/********************************************************************************
 * COINS                                                                        *
 * The purpose of the coin state submodule is to have a deep understanding of   *
 * the price movement for each installed coin, as well as keeping the state     *
 * updated.                                                                     *
 ********************************************************************************/

// Service
export interface ICoinsService {
    // Properties
    
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Coin Management
    getInstalledCoin(symbol: string): ICoin,
    getCoinsSummary(): ICoinsSummary,
    installCoin(symbol: string): Promise<ICoinsSummary>,
    uninstallCoin(symbol: string): Promise<ICoinsSummary>,

    // State Calculations
    calculateState(): ICoinsState,
    getCoinFullState(symbol: string): ICoinState,
    getDefaultState(): ICoinsState,
}


/* Coins */


// The record of a coin
export interface ICoin {
    // The symbol|pair that identifies the coin.
    symbol: string, // "BTCUSDT"|"ETHUSDT"|"BCHUSDT"...

    // The decimal precision to be applied to the coin's price
    pricePrecision: number, // BTC: 2

    // The decimal precision to be applied to the coin's quantity
    quantityPrecision: number // BTC: 3
}


// The object containing all supported or installed coins
export interface ICoinsObject {
    [symbol: string]: ICoin
}


// The object containing the installed & supported coins
export interface ICoinsSummary {
    installed: ICoinsObject,
    supported: ICoinsObject
}





/* State */



// Full Coin State
export interface ICoinState {
    // The state of the coin
    s: IStateType,

    // The split states payload
    ss: ISplitStates,

    /**
     * State Event
     * This event refers to a coin's price starting a reversal. When the price is dropping
     * and suddently starts rising, it is known as a "Support Reversal". On the contrary, 
     * when the price has been rising and starts dropping, it is known as a "Resistance Reversal".
     * Moreover, when an event is detected, it also has an intensity based on how hard the price
     * had decreased/increased prior to reversing. 
     * Support Reversals can be -2 (reversal occurred after a strong crash) or a -1.
     * Resistance Reversals can be 2 (reversal occurred after a strong increase) or 1.
     * If the state event of a coin is 0, means there is no event at all.
     */
    se: IStateType,

    // The coin prices within the window
    w: ISplitStateSeriesItem[]
}


// Minified Coin State
export interface IMinifiedCoinState {
    // The state of the coin
    s: IStateType,

    // The state event
    se: IStateType,
}


// State Object
export interface ICoinsState {
    [symbol: string]: IMinifiedCoinState
}






























/*********************************************************************************
 * MARKET STATE                                                                  *
 * Every certain period of time, the market state is calculated and broadcasted. *
 * This enables other modules to perform actions based on any kind of event.     *
 *********************************************************************************/
export interface IMarketState {
    window: IWindowState,
    volume: IStateType,
    liquidity: IMinifiedLiquidityState,
    keyzones: IKeyZoneState,
    trend: ITrendState,
    coins: ICoinsState
}