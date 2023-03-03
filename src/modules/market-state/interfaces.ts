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




/* OPEN INTEREST STATE */
export interface IOpenInterestStateService {
    // Properties
    state: IOpenInterestState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getDefaultState(): IOpenInterestState,
}



/* LONG/SHORT RATIO STATE */
export interface ILongShortRatioStateService {
    // Properties
    state: ILongShortRatioState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getDefaultState(): ILongShortRatioState,
}



/* TECHNICAL ANALYSIS STATE */
export interface ITechnicalAnalysisStateService {
    // Properties
    state: ITAState,
    minState: IMinifiedTAState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getIntervalState(intervalID: ITAIntervalID): ITAIntervalState,
    getDefaultState(): ITAState,
    getDefaultMinifiedState(): IMinifiedTAState
}




/* KEYZONES STATE */
export interface IKeyZonesStateService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    calculateState(fullState?: boolean): IKeyZoneState|IKeyZoneFullState,
    getDefaultState(): IKeyZoneState,
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
        minChange: number,
        strongChange: number
    ): { state: IStateType, state_value: number }
}











/*********
 * STATE *
 *********/



/**
 * State Type
 * All market state modules can be stateful or stateless and are update constantly.
 * There are 2 kinds of modules within the Market State. There are those that rely
 * on a sequence of values and the state is calculated based on the percentage change
 * between the beginning and the end of the window. On the other hand, there are
 * other modules which don't rely on a sequence but instead the result of a series
 * of calculations.
 * 
 * Sequence Based Modules:
 * A stateless type (0) is active when the change between the beginning and
 * the end of the window (or any sequence) doesn't meet the requirement.
 * An increasing state (2|1) is issued when the window as increased the required
 * % and that the latest value is within the upper band. On the other hand,
 * for a decreasing state (-2|-1) to be issued, the window must have decreased the
 * required % and the latest value must be within the lower band.
 * 
 * Technical Analysis Module:
 * A neutral type (0) is active when the indicators are not explicitly pointing 
 * towards a direction. The buy type is represented with a 1 while the strong buy 
 * is represented with a 2. In contrast, sell is represented with a -1 and strong
 * sell with a -2.
 */
export type IStateType = -2|-1|0|1|2;



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
    //middle: number,

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
    // The direction in which the volume is driving the price
    direction: IStateType,

    // The value of the currently winning direction
    direction_value: number,

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
 * OPEN INTEREST STATE                                                      *
 * The purpose of the open interest state is to enable programatic          *
 * understanding of the interest in the futures market.                     *
 ****************************************************************************/
 export interface IOpenInterestState extends IState {
    // The list of grouped interest values
    interest: number[]
}













/****************************************************************************
 * LONG/SHORT RATIO STATE                                                   *
 * The purpose of the long/short state is to enable programatic             *
 * understanding of the ratio in the futures market.                        *
 ****************************************************************************/
 export interface ILongShortRatioState extends IState {
    // The list of grouped long/short ratio values
    ratio: number[]
}


















/****************************
 * TECHNICAL ANALYSIS STATE *
 ****************************/




/**
 * Technical Analysis Datasets
 * In order to optimize the calculation process, the candlesticks
 * must be converted into datasets. Each list should have at least
 * 210 items.
 */
export interface ITADataset {
    open: number[],
    close: number[],
    high: number[],
    low: number[],
    volume: number[]
}
export interface ITADatasets {
    "15m": ITADataset,
    "30m": ITADataset,
    "1h": ITADataset,
    "2h": ITADataset,
    "4h": ITADataset,
    "1d": ITADataset
}





/**
 * Interval Identifier
 * In order to be able to identify what most traders are seeing, 
 * the indicators are calculated for all popular intervals.
 */
export type ITAIntervalID = "15m"|"30m"|"1h"|"2h"|"4h"|"1d";



/**
 * Indicator State Action
 * The indicator's suggested action.
 */
export type ITAIndicatorAction = "BUY"|"SELL"|"NEUTRAL";





/**
 * Interval State Result Counter
 * The counter used to store the indicators' suggested actions.
 */
export interface ITAIndicatorActionCounter {
    BUY: number,
    SELL: number,
    NEUTRAL: number
}



/**
 * Interval State Result
 * The result for the summary, oscillators and the moving averages.
 */
export interface ITAIntervalStateResult {
    // Action: the action suggested by the state results
    a: IStateType,

    // Buy: the count of the indicators that suggest the price will rise
    b: number,

    // Sell: The count of the indicators that suggest the price will fall
    s: number,

    // Neutral: the count of the indicators that have no suggestions
    n: number
}



/**
 * Indicator Payload
 * The object built when an indicator is calculated and evaluated.
 */
export interface ITAIndicatorPayload {
    // Value: the result of the indicator
    v: number[],

    // Action: the action suggested by the indicator
    a: ITAIndicatorAction
}




/**
 * Oscillators Build
 * All the data related to the current state of the oscillators
 * for a given interval.
 */
export interface ITAOscillatorsBuild {
    // The indicator Action Counter for the oscillators only
    counter: ITAIndicatorActionCounter,

    // Indicators Payload
    rsi_14: ITAIndicatorPayload,
    cci_20: ITAIndicatorPayload,
    adx_14: ITAIndicatorPayload,
    ao: ITAIndicatorPayload,
    mom_10: ITAIndicatorPayload,
    macd_12_26_9: ITAIndicatorPayload,
    stoch_14_1_3: ITAIndicatorPayload,
    stochrsi_14: ITAIndicatorPayload,
    willr_14: ITAIndicatorPayload,
    ultosc_7_14_28: ITAIndicatorPayload
}


/**
 * Moving Averages Build
 * All the data related to the current state of the moving averages
 * for a given interval.
 */
export interface ITAMovingAveragesBuild {
    // The indicator Action Counter for the moving averages only
    counter: ITAIndicatorActionCounter,

    // Indicators Payload
    ema_10: ITAIndicatorPayload,
    ema_20: ITAIndicatorPayload,
    ema_30: ITAIndicatorPayload,
    ema_50: ITAIndicatorPayload,
    ema_100: ITAIndicatorPayload,
    ema_200: ITAIndicatorPayload,
    sma_10: ITAIndicatorPayload,
    sma_20: ITAIndicatorPayload,
    sma_30: ITAIndicatorPayload,
    sma_50: ITAIndicatorPayload,
    sma_100: ITAIndicatorPayload,
    sma_200: ITAIndicatorPayload,
    hma_9: ITAIndicatorPayload
}



/**
 * Interval State Result Build
 * Object generated once all technical analysis indicators have been
 * calculated. Contains the results for each category.
 */
export interface ITAIntervalStateResultBuild {
    summary: ITAIntervalStateResult,
    oscillators: ITAIntervalStateResult,
    moving_averages: ITAIntervalStateResult,
}





/**
 * Interval State
 * The object containing the final technical analysis state for an interval.
 */
export interface ITAIntervalState {
    // Summary: The result of the state, combining oscillators and moving averages
    s: ITAIntervalStateResult,

    // Oscillators: The result of the oscillators
    o: ITAIntervalStateResult,

    // Moving Averages: The result of the moving averages
    m: ITAIntervalStateResult,

    // The payload containing the indicator's data
    p: {
        // Oscillators
        rsi_14: ITAIndicatorPayload,
        cci_20: ITAIndicatorPayload,
        adx_14: ITAIndicatorPayload,
        ao: ITAIndicatorPayload,
        mom_10: ITAIndicatorPayload,
        macd_12_26_9: ITAIndicatorPayload,
        stoch_14_1_3: ITAIndicatorPayload,
        stochrsi_14: ITAIndicatorPayload,
        willr_14: ITAIndicatorPayload,
        ultosc_7_14_28: ITAIndicatorPayload,

        // Moving Averages
        ema_10: ITAIndicatorPayload,
        ema_20: ITAIndicatorPayload,
        ema_30: ITAIndicatorPayload,
        ema_50: ITAIndicatorPayload,
        ema_100: ITAIndicatorPayload,
        ema_200: ITAIndicatorPayload,
        sma_10: ITAIndicatorPayload,
        sma_20: ITAIndicatorPayload,
        sma_30: ITAIndicatorPayload,
        sma_50: ITAIndicatorPayload,
        sma_100: ITAIndicatorPayload,
        sma_200: ITAIndicatorPayload,
        hma_9: ITAIndicatorPayload
    }
}




/**
 * Technical Analysis State
 * The current state of the technicals based on the intervals. This object is 
 * minified and inserted into the market state. The entire payload can be 
 * queried by interval through the market state's endpoint.
 */
export interface ITAState {
    // States by Interval
    "15m": ITAIntervalState,
    "30m": ITAIntervalState,
    "1h": ITAIntervalState,
    "2h": ITAIntervalState,
    "4h": ITAIntervalState,
    "1d": ITAIntervalState,

    // The timestamp in which the state was generated
    ts: number
}






/* Minified Technical Analysis State */



/**
 * Minified Interval State
 * A minified object of an interval's state.
 */
export interface IMinifiedIntervalState {
    // Summary: The result of the state, combining oscillators and moving averages
    s: ITAIntervalStateResult,

    // Oscillators: The result of the oscillators
    o: ITAIntervalStateResult,

    // Moving Averages: The result of the moving averages
    m: ITAIntervalStateResult
}




/**
 * Technical Analysis State
 * The current state of the technicals based on the intervals. This object is 
 * inserted into the market state.
 */
export interface IMinifiedTAState {
    // Result: Average State
    r: IStateType,

    // States by Interval
    "15m": IMinifiedIntervalState,
    "30m": IMinifiedIntervalState,
    "1h": IMinifiedIntervalState,
    "2h": IMinifiedIntervalState,
    "4h": IMinifiedIntervalState,
    "1d": IMinifiedIntervalState,

    // The timestamp in which the state was generated
    ts: number
}













/*****************************************************************************
 * KEYZONES STATE                                                            *
 * The purpose of the keyzones state is to enable programatic understanding  *
 * of nearby supports and resistances for building more efficient strategies *
 *****************************************************************************/




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
export interface IMinifiedKeyZone extends IKeyZonePriceRange { }
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

    // The timestamp in which the build was generated
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
    open_interest: IOpenInterestState,
    long_short_ratio: ILongShortRatioState,
    technical_analysis: IMinifiedTAState,
    keyzones: IKeyZoneState
}