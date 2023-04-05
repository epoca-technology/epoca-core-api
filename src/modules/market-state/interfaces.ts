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























/********************************************************************************
 * LIQUIDITY STATE                                                              *
 * The purpose of the liquidity state submodule is to have a deep understanding *
 * of the order book, identify levels at which there are liquidity peaks and be *
 * able to determine the market's direction (sentiment?)                        *
 ********************************************************************************/

// Service
export interface ILiquidityStateService {
    // Properties

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    calculateState(currentPrice: number): ILiquidityState,
}



/**
 * Liquidity Side
 * The order book is comprised by asks (Sell Orders) and bids (Buy Orders).
 * Asks are ordered by price from low to high while bids from high to low.
 */
export type ILiquiditySide = "asks"|"bids";




/**
 * Liquidity Price Level
 * The record containing all relevant information regarding a price level.
 */
export interface ILiquidityPriceLevel {
    // The level's price
    p: number,

    // The BTC liquidity within the level
    l: number
}






/**
 * Liquidity Side Build
 * When the order book is retrieved in a raw format, it is processed by unit.
 * When calculating the current state of the liquidity, only price levels
 * before or after the current market price will be included.
 */
export interface ILiquiditySideBuild {
    // The total liquidity accumulated in all levels
    t: number,

    // The list of price levels
    l: ILiquidityPriceLevel[]
}




/**
 * Liquidity State
 * The full state of the liquidity. This object can be queried through the endpoint or
 * used by any other module.
 */
export interface ILiquidityState {
    /**
     * The liquidity builds by side based on the current market price,
     * ordered accordingly:
     * - Asks are ordered by price from low to high
     * - Bids are ordered by price from high to low
     */
    a: ILiquiditySideBuild, // Asks
    b: ILiquiditySideBuild, // Bids

    // The timestamp in ms in which the liquidity state was last updated
    ts: number
}
























/*****************************************************************************
 * KEYZONES STATE                                                            *
 * The purpose of the keyzones state is to enable programatic understanding  *
 * of nearby supports and resistances for building more efficient strategies *
 *****************************************************************************/


// Service
export interface IKeyZonesStateService {
    // Properties
    config: IKeyZonesConfiguration,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // State Calculation
    calculateState(windowSplitStates?: ISplitStates, fullState?: boolean): IKeyZoneState|IKeyZoneFullState,
    getDefaultState(): IKeyZoneState,

    // Configuration Management
    updateConfiguration(newConfiguration: IKeyZonesConfiguration): Promise<void>
}





/**
 * Score Weights
 * The values used to score a KeyZone based on the most relevant parameters.
 */
export interface IKeyZoneScoreWeights {
    // The worth of the KeyZone's Volume Intensity
    volume_intensity: number,

    // The worth of the KeyZone's Liquidity Share
    liquidity_share: number,
}


/**
 * Configuration
 * The KeyZones' Module Configuration that can be managed from the GUI.
 */
export interface IKeyZonesConfiguration {
    /**
     * Build Frequency
     * Once the KeyZones Module is initialized, a build is made and an interval
     * that will re-build the KeyZones every buildFrequencyHours is started.
     */
    buildFrequencyHours: number,

    /**
     * Build Lookback Size
     * The number of 15-minute-interval candlesticks that will be used to build
     * the KeyZones.
     */
    buildLookbackSize: number,

    /**
     * Zone Size
     * The zone's size percentage. The start and end prices are based on this value.
     */
    zoneSize: number,

    /**
     * Merge Distance
     * Once all zones have been set and ordered by price, it will merge the ones that 
     * are close to one another.
     */
    zoneMergeDistanceLimit: number,

    /**
     * State Limit
     * Limits the number of zones returned from the current price. For example, 
     * if 2 is provided, it retrieves 4 zones in total (2 above and 2 below)
     */
    stateLimit: number,

    /**
     * Score Weights
     * The object containing the weights that will be used to calculate a 
     * KeyZone's Score. The score should be limitted to a number from 0 to 10.
     */
    scoreWeights: IKeyZoneScoreWeights,

    /**
     * Price Snapshots Limit
     * The limit of the 1-minute-candlestick snapshots that are taken whenever
     * there is an update (every ~3 seconds).
     */
    priceSnapshotsLimit: number,

    /**
     * Event Duration
     * The number of seconds a KeyZone event will remain active after being
     * issued based on its kind.
     */
    supportEventDurationSeconds: number,
    resistanceEventDurationSeconds: number,

    /**
     * KeyZone Idle Duration
     * The number of minutes a KeyZone will remain idle after issuing an event.
     */
    keyzoneIdleOnEventMinutes: number,

    /**
     * Event Score Requirement
     * The minimum score needed by a KeyZone in order to be capable of issuing
     * an event.
     */
    eventScoreRequirement: number
}






/**
 * Reversal Type
 * A reversal can be of 2 kinds:
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 */
export type IReversalType = "r"|"s"; // r = Resistance | s = Support



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
 * Volume Intensity
 * The intensity of the volume within the KeyZone.
 */
export type IKeyZoneVolumeIntensity = 0|1|2|3|4;





/**
 * Idle KeyZones
 * When an event is detected on a KeyZone, this one becomes idle for a period
 * of time. While idling, a KeyZone cannot emmit events.
 */
export interface IIdleKeyZones {
    [keyzoneID: number]: number // KeyZone ID: Idle Until Timestamp
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
    // The date in which the keyzone was first detected
    id: number,

    // Volume Intensity
    vi: IKeyZoneVolumeIntensity,

    // Liquidity Share
    ls: number,

    // KeyZone Score
    scr: number
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
 * KeyZone State Event
 * The state event indicates that a KeyZone with a score greater than or equals
 * to the requirement has been hit by the market.
 */
export type IKeyZoneStateEventKind = "s"|"r";
export interface IKeyZoneStateEvent {
    // The kind of event
    k: IKeyZoneStateEventKind,

    // The KeyZone that was hit by the price
    kz: IMinifiedKeyZone,

    // The time at which the event was issued
    t: number,

    // The event's expiration timestamp
    e: number
}



/**
 * KeyZone State
 * A state can be generated by providing the latest price. It will check if the price
 * is in a zone and return the zones nearby.
 */
export interface IKeyZoneState {
    // The active state event (if any)
    event: IKeyZoneStateEvent|null,

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

    // The price snapshots
    price_snapshots: ICandlestick[],

    // Idle KeyZones
    idle: IIdleKeyZones,

    // The timestamp in which the build was generated
    build_ts: number
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
    getInstalledCoinAndPrice(symbol: string): {coin: ICoin, price: number},
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

// The object containing all the scores by symbol
export type ICoinScore = 1|2|3|4|5;
export interface ICoinsScores {
    [symbol: string]: ICoinScore
}

// The object containing the installed & supported coins
export interface ICoinsSummary {
    installed: ICoinsObject,
    supported: ICoinsObject,
    scores: ICoinsScores
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

    /**
     * State Event Time
     * The time at which the event was first issued. It is null if there is no event.
     */
    set: number|null,

    // The coin prices within the window
    w: ISplitStateSeriesItem[]
}


// Minified Coin State
export interface IMinifiedCoinState {
    // The state of the coin
    s: IStateType,

    // The state event
    se: IStateType,

    // The state event time
    set: number|null,
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
    keyzones: IKeyZoneState,
    trend: ITrendState,
    coins: ICoinsState
}