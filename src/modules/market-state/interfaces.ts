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

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getDefaultState(): ITAState,
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
    // The direction in which the volume is driving the price
    direction: IStateType,

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
export type ITAIntervalID = "30m"|"1h"|"2h"|"4h"|"1d";



/**
 * Indicator State Action
 * The indicator's suggested action.
 */
export type ITAIndicatorAction = "BUY"|"SELL"|"NEUTRAL";




/**
 * @DEPRECATE in favor of IStateType
 * Interval State Action
 * In contrast to the indicator state, if many buys or sells suggestions
 * accumulate, a "strong" state is generated.
 */
//export type ITAIntervalStateAction = "BUY"|"STRONG_BUY"|"SELL"|"STRONG_SELL"|"NEUTRAL";



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
 * inserted into the market state.
 */
export interface ITAState {
    // States by Interval
    "30m": ITAIntervalState,
    "1h": ITAIntervalState,
    "2h": ITAIntervalState,
    "4h": ITAIntervalState,
    "1d": ITAIntervalState,

    // The timestamp in which the state was generated
    ts: number
}





















/*********************************************************************************
 * MARKET STATE                                                                  *
 * Every certain period of time, the market state is calculated and broadcasted. *
 * This enables other modules to perform actions based on any kind of event.     *
 *********************************************************************************/
export interface IMarketState {
    window: IWindowState,
    volume: IVolumeState,
    network_fee: INetworkFeeState,
    open_interest: IOpenInterestState,
    long_short_ratio: ILongShortRatioState,
    technical_analysis: ITAState
}