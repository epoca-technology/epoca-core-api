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



/* WINDOW STATE */
export interface IWindowStateService {
    calculateState(window: ICandlestick[]): IWindowState,
    getDefaultState(): IWindowState,
}




/* VOLUME STATE */
export interface IVolumeStateService {
    calculateState(window: ICandlestick[]): IVolumeState
    getDefaultState(): IVolumeState,
}



/* KEYZONES STATE */
export interface IKeyZonesStateService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    calculateState(price: number): IKeyZoneState,
    getDefaultState(): IKeyZoneState,
}



/* NETWORK FEE STATE */
export interface INetworkFeeStateService {
    // Properties
    state: INetworkFeeState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getDefaultState(): INetworkFeeState,
}


/**
 * State Utilities Service
 * Provides a series of functionalities that simplify
 * state calculations.
 */
export interface IStateUtilitiesService {
    buildAveragedGroups(values: number[], groups: number): number[],
    calculateBands(minVal: number, maxVal: number): IStateBandsResult,
    calculateState(
        initialValue: number, 
        lastValue: number, 
        bands: IStateBandsResult,
        minChange: number
    ): { state: IStateType, state_value: number }
}








/*********
 * STATE *
 *********/



/**
 * State Type
 * A stateless type is active when the change between the beginning and
 * the end of the window (or any sequence) doesn't meet the requirement.
 * An increasing state is issued when the window as increased the required
 * % and that the latest value is within the upper band. On the other hand,
 * for a decreasing state to be issued, the window must have decreased the
 * required % and the latest value must be within the lower band.
 */
export type IStateType = "stateless"|"increasing"|"decreasing";



/**
 * State Band
 * Represents the beginning and end of the upper or lower band.
 */
export interface IStateBand {
    start: number,
    end: number
}


/**
 * State Bands Result
 * Represents the band and the middle of the current state.
 */
export interface IStateBandsResult {
    // The middle of the window
    middle: number,

    // The upper and lower bands
    upper_band: IStateBand, 
    lower_band: IStateBand
}





/**
 * State
 * A state can be calculated with a window or any kind of sequence. This interface
 * can also be extended and tailored per module.
 */
export interface IState {
    // State
    state: IStateType,
    state_value: number,

    // Bands
    upper_band: IStateBand,
    lower_band: IStateBand,

    // The timestamp in which the state was last updated
    ts: number
}







/****************************************************************************
 * WINDOW STATE                                                             *
 * The purpose of the window state is to enable programatic understanding   *
 * of the current price based on a given window.                            *
 ****************************************************************************/
export interface IWindowState extends IState {
    // The prediction candlesticks that comprise the window
    window: ICandlestick[]
}






/****************************************************************************
 * VOLUME STATE                                                             *
 * The purpose of the volume state is to enable programatic understanding   *
 * of the volume based on the current value.                                *
 ****************************************************************************/
export interface IVolumeState extends IState {
    // The list of grouped volumes
    volumes: number[]
}


/**
 * Mempool Block Fee Record
 * When interacting with Mempool's API, a list of records will be retrieved.
 * For this module, make use of the avgFee_50 property.
 */
export interface IMempoolBlockFeeRecord {
    avgHeight: number,
    timestamp: number,
    avgFee_0: number,
    avgFee_10: number,
    avgFee_25: number,
    avgFee_50: number, // <- Use this property
    avgFee_75: number,
    avgFee_90: number,
    avgFee_100: number
}








/****************************************************************************
 * NETWORK FEE STATE                                                        *
 * The purpose of the network fee state is to enable programatic            *
 * understanding of the bitcoin network fees based on the latest value      *
 ****************************************************************************/
 export interface INetworkFeeState extends IState {
    // The current height of the bitcoin blockchain
    height: number,

    // The list of grouped fees
    fees: number[]
}








/*****************************************************************************
 * KEYZONES STATE                                                            *
 * The purpose of the keyzones state is to enable programatic understanding  *
 * of nearby supports and resistances for building more efficient strategies *
 *****************************************************************************/


/**
 * KeyZone Candlestick
 * When the raw daily candlesticks are downloaded from Binance, they are converted
 * into the following format in order to simplify the interactions.
 */
export interface IKeyZoneCandlestick {
    // Open Time
    ot: number,

    // Highest price in the candlestick
    h: number,

    // Lowest price in the candlestick
    l: number
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
    t: IReversalType
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
export interface IKeyZone extends IKeyZonePriceRange {
    // The date in which the keyzone was first detected
    id: number,

    // List of reversals that took place at the zone, ordered by date ascending
    r: IReversal[],

    // A KeyZone is considered to have mutated when it has reversed in both ways
    m: boolean
}



/**
 * KeyZone State
 * A state can be generated by providing the latest price. It will check if the price
 * is in a zone and return the zones nearby.
 */
export interface IKeyZoneState {
    // The keyzone the price is in (if any)
    active: IKeyZone|undefined,

    // The list of keyzones above the current price
    above: IKeyZone[],

    // The list of keyzones below the current price
    below: IKeyZone[],

    // The timestamp in which the state was generated
    ts: number,

    // The timestamp in which the build was las updated
    build_ts: number
}






/*********************************************************************************
 * MARKET STATE                                                                  *
 * Every certain period of time, the market state is calculated and broadcasted. *
 * This enables other modules to perform actions based on any kind of event.     *
 *********************************************************************************/
export interface IMarketState {
    window: IWindowState,
    volume: IVolumeState,
    keyzone: IKeyZoneState,
    network_fee: INetworkFeeState
}