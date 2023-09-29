import { 
    IBinanceActivePosition,
    IBinanceMarginType, 
    IBinancePositionSide, 
    IBinanceTradeExecutionPayload 
} from "../binance";
import { ICoin } from "../market-state";





// Service
export interface IPositionService {
    // Properties
    strategy: IPositionStrategy,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Position Actions
    onReversalStateEvent(side: IBinancePositionSide): Promise<void>,
    closePosition(side: IBinancePositionSide, chunkSize?: number): Promise<void>,

    // Retrievers
    getActivePositionHeadlines(): IActivePositionHeadlines,
    getPositionRecord(id: string): Promise<IPositionRecord>,
    listPositionHeadlines(startAt: number, endAt: number): Promise<IPositionHeadline[]>,
    listPositionActionPayloads(
        kind: IPositionActionKind, 
        startAt: number, 
        endAt: number
    ): Promise<IPositionActionRecord[]>,

    // Position Strategy
    updateStrategy(newStrategy: IPositionStrategy): Promise<void>,
}



// Utilities
export interface IPositionUtilities {
    // Properties
    btcSymbol: string,

    // Position Management Helpers
    calculateGainState(
        side: IBinancePositionSide, 
        entryPrice: number,
        markPrice: number,
        highestGain: number,
    ): IPositionGainState,
    calculateReductionChunkSize(
        currentPrice: number,
        positionAmount: number, 
        activeLevel: ITakeProfitLevelID
    ): number,

    // Position Build
    buildNewPositionRecord(pos: IBinanceActivePosition): IPositionRecord,
    calculatePositionExitStrategy(
        side: IBinancePositionSide, 
        entryPrice: number, 
        pricePrecision: number
    ): IPositionExitStrategy,

    // Position Candlesticks Helpers
    buildUpdatedCandlestickItem(currentValue: number, item: Partial<IPositionCandlestick>): Partial<IPositionCandlestick>,
    buildCandlestickRecord(active: IActivePositionCandlestick): IPositionCandlestickRecord,
    buildNewActiveCandlestick(
        openTime: number, 
        markPrice: number, 
        gain: number, 
        intervalMinutes: number
    ): IActivePositionCandlestick,


    // Position Actions
    openPosition(side: IBinancePositionSide): Promise<void>,
    closePosition(position: IPositionRecord, chunkSize?: number): Promise<void>,

    // Active Position Headlines Helper
    buildActivePositionHeadlines(long: IPositionRecord|null, short: IPositionRecord|null): IActivePositionHeadlines,

    // Trading Strategy Helpers
    canSideBeIncreased(
        side: IBinancePositionSide, 
        entryPrice: number, 
        currentPrice: number, 
        notional: number,
        nextIncrease: number
    ): boolean,
    strategyChanged(newStrategy: IPositionStrategy): void,
    buildDefaultStrategy(): IPositionStrategy,
    calculateMaxSideNotional(): number
}







// Validations
export interface IPositionValidations {
    // Position Record Management
    canPositionRecordBeRetrieved(id: string): void,
    canPositionHeadlinesBeListed(startAt: number, endAt: number): void,

    // Position Action Payload Management 
    canPositionActionPayloadsBeListed(kind: IPositionActionKind, startAt: number, endAt: number): void,

    // Position Strategy
    canStrategyBeUpdated(newStrategy: IPositionStrategy): void,
}







// Model
export interface IPositionModel {
    // Position Records Management
    savePosition(position: IPositionRecord): Promise<void>,
    getPositionRecord(id: string): Promise<IPositionRecord>,
    listPositionHeadlines(startAt: number, endAt: number): Promise<IPositionHeadline[]>,

    // Position Action Payload Management
    savePositionActionPayload(
        kind: IPositionActionKind, 
        symbol: string,
        side: IBinancePositionSide,
        payload: IBinanceTradeExecutionPayload
    ): Promise<void>,
    listPositionActionPayloads(
        kind: IPositionActionKind, 
        startAt: number, 
        endAt: number
    ): Promise<IPositionActionRecord[]>,

    // Position Strategy
    getStrategy(): Promise<IPositionStrategy|undefined>,
    createStrategy(strategy: IPositionStrategy): Promise<void>,
    updateStrategy(strategy: IPositionStrategy): Promise<void>,
}















/*********************
 * Position Strategy *
 *********************/




/**
 * Take Profit Level
 * The trading strategy makes use of 5 take profit levels that have different
 * characteristics that vary based on the accumulated gain.
 */
export type ITakeProfitLevelID = "take_profit_1"|"take_profit_2"|"take_profit_3"|"take_profit_4"|"take_profit_5";
export interface ITakeProfitLevel {
    // The price percentage change from the entry price for the level to be active
    price_change_requirement: number,

    /**
     * The size of the chunk that will be reduced from the position whenever
     * the conditions apply. 
     */
    reduction_size: number,

    // The frequency at which reductions can be executed
    reduction_interval_minutes: number
}



/**
 * Strategy 
 * The configuration that handles the core position entry and exit flow.
 */
export interface IPositionStrategy {
    /**
     * Position Status
     * Each side has its own status. If enabled when a trading signal is generated,
     * it will open a position.
     */
    long_status: boolean,
    short_status: boolean,

    /**
     * Leverage
     * The leverage that will be used to calculate the position amount whenever a
     * position is opened. The leverage has to be set manually per installed coin,
     * otherwise, the position opening may behave unexpectedly.
     */
    leverage: number,

    /**
     * Position Size
     * The amount of money allocated to the position as collateral will always be 
     * the same, no matter the side. If there isn't enough balance to cover the size, 
     * the position cannot be opened.
     */
    position_size: number,

    /**
     * Side Increase Limit
     * The maximum number of times that a side can be increased. This limit is obtained
     * as follows: (position_size * leverage) * side_increase_limit.
     * Once the side's notional reaches this value, the system will stop increasing it.
     */
    side_increase_limit: number,

    /**
     * Side Minimum Percentage
     * The minimum % a position can have based on the original position size. If a reduction
     * was to take place and the remaining% of the position is less than equals to this value,
     * the position will be fully closed instead.
     */
    side_min_percentage: number,

    /**
     * Increase Side On Price Improvement%
     * When a side is opened, the entry price is adjusted and stored based on 
     * increase_side_on_price_improvement%. This will allow the increasing of 
     * sides only when the price has improved. Keep in mind that this value
     * will be updated whenever a position increase takes place.
     */
    increase_side_on_price_improvement: number,

    /**
     * Side Increase Idle Hours
     * The number of hours that comprise the period in which a side cannot
     * be increased, regardless of the flucturation of the price.
     */
    side_increase_idle_hours: number,

    /**
     * Profit Optimization Strategy
     * When a position is opened, a take profit grid is generated. Each level
     * activates when hit by the mark price. Position reductions are executed
     * accordingly when the position is profitable.
     */
    take_profit_1: ITakeProfitLevel,
    take_profit_2: ITakeProfitLevel,
    take_profit_3: ITakeProfitLevel,
    take_profit_4: ITakeProfitLevel,
    take_profit_5: ITakeProfitLevel
}



/**
 * Position Exit Strategy
 * The exit prices calculated when a new position is detected.
 */
export interface IPositionExitStrategy {
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,
    take_profit_price_4: number,
    take_profit_price_5: number,
}



/**
 * Position Gain State
 * Whenever an active position refreshes, its gain state changes as
 * prices are constantly fluctuating.
 */
export interface IPositionGainState {
    // Gain%
    gain: number,

    // Highest Gain%
    highest_gain: number,

    // The take profit that is currently active (if any)
    active_tp_level: ITakeProfitLevelID|undefined
}










/**
 * Active Positions
 * The system can manage 1 position per side at a time and is stored in memory
 * until the positions is closed and then stored in the db.
 */
export interface IActivePositions {
    LONG: IPositionRecord|null,
    SHORT: IPositionRecord|null,
}
export interface IActivePositionHeadlines {
    LONG: IPositionHeadline|null,
    SHORT: IPositionHeadline|null,
}










/*******************
 * BINANCE ACCOUNT *
 *******************/









/* Positions */





/**
 * Position Record
 * The object containing all the information about the position, including
 * the price history.
 */
export interface IPositionRecord {
    // Universal Unique Identifier
    id: string, 

    // Date Range Timestamps
    open: number,
    close: number|undefined, // If undefined, the position is active

    // The time at which the position side can be increased
    next_increase: number,


    /* Data Provided by Binance */

    // The coin of the position
    coin: ICoin,

    // The type of position "LONG"|"SHORT".
    side: IBinancePositionSide,

    // The leverage used in the position.
    leverage: number,

    // The type of margin in which the position was opened. Always should be "isolated".
    margin_type: IBinanceMarginType,

    // The mark price when the active positions were updated.
    mark_price: number,

    // The weighted entry price based on all the trades within the position.
    entry_price: number,

    // The price at which the position will be automatically liquidated by the exchange.
    liquidation_price: number,

    // The current unrealized PNL in USDT
    unrealized_pnl: number,

    // The total margin (USDT) put into the position.
    isolated_wallet: number,

    // The current value of the isolated_wallet + unrealized_pnl.
    isolated_margin: number,

    // The size of the position in BTC with leverage included.
    position_amount: number,

    // The size of the position in USDT with leverage included.
    notional: number,




    /* Strategy Related Data */

    // The prices at which each level is activated
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,
    take_profit_price_4: number,
    take_profit_price_5: number,

    // The reductions that have been applied to the position
    reductions: {
        take_profit_1: IPositionReduction[],
        take_profit_2: IPositionReduction[],
        take_profit_3: IPositionReduction[],
        take_profit_4: IPositionReduction[],
        take_profit_5: IPositionReduction[],
    },

    /**
     * The % the price has moved in favor or against. If losing, the value will be a negative number.
     * The system also keeps track of the highest gain that has been recorded.
     */
    gain: number,
    highest_gain: number,



    
    /* History */

    // The list of packed candlesticks that detail the position's history
    history: IPositionCandlestickRecord[]
}



/**
 * Position Reduction
 * The record containing all the information regarding a reduction triggered
 * by the profit optimization strategy.
 */
export interface IPositionReduction {
    // The time at which the reduction took place
    t: number, // Timestamp

    // The time at which the next reduction can take place
    nr: number, // Next Reduction

    // The size of the chunk that was reduced
    rcz: number, // Reduction Chunk Size

    // The gain the position had accumulated when the reduction took place
    g: number, // Gain
}











/**
 * Position Headline
 * The object containing a very minified version of the Position Record containing
 * just essential data.
 */
export interface IPositionHeadline {
    // Universal Unique Identifier
    id: string, 

    // The timestamp in which the position was opened
    o: number,

    // The symbol of the coin
    s: string, 

    // The side of the position
    sd: IBinancePositionSide,

    // Isolated Wallet: The total margin (USDT) put into the position.
    iw: number,

    // The gain% the price has moved in favor or against. If losing, the value will be a negative number
    g: number
}







/* Position History Candlesticks */


/**
 * Position Candlestick
 * The position candlestick object. This interface is used to manage the active
 * candlestick and to visualize them through the GUI after unpacking 
 * the IPositionCandlestickRecord.
 */
export interface IPositionCandlestick {
    // Open Timestamp: the time in which the candlestick was first built
    ot: number,

    // Open: the Mark Price|Gain% when the candlestick was first built
    o: number,

    // High: the highest Mark Price|Gain% in the candlestick
    h: number,

    // Low: the lowest Mark Price|Gain% in the candlestick
    l: number,

    // Close: the last Mark Price|Gain% in the candlestick 
    c: number
}





/**
 * Active Position Candlestick
 * When the candlestick is active, it is handled in an easy-to-manage format. 
 * Once the close time arrives, they are converted into a record and then
 * added to the history. Finally, the new candlestick is initialized.
 */
export interface IActivePositionCandlestick {
    // The time at which the candlestick first came into existance
    ot: number,

    /**
     * The time at which the candlestick closes. This value is only to be used
     * for optimization reasons and should not be stored in the record.
     */
    ct: number,

    // The candlestick containing the Mark Price history within the interval
    markPrice: Partial<IPositionCandlestick>,

    // The candlestick containing the Gain% history within the interval
    gain: Partial<IPositionCandlestick>
}






/**
 * Position Candlestick Record
 * For optimization purposes, the candlesticks for the mark price, gain & gain
 * drawdown% are stored together and should be unpacked in the GUI.
 * The properties within data contain lists with the following indexes:
 * 0 = Mark Price
 * 1 = Gain%
 * 2 = Gain Drawdown%
 */
export interface IPositionCandlestickRecord {
    // The time at which the candlestick first came into existance
    ot: number,

    // The candlesticks' data
    d: {
        // Open Value:  Mark Price, Gain%
        o: [number, number],

        // High Value:  Mark Price, Gain%
        h: [number, number],

        // Low Value:   Mark Price, Gain%
        l: [number, number],

        // Close Value: Mark Price, Gain%
        c: [number, number]
    }
}




/**
 * Trade Execution Payload
 * Whenever an action such as opening or closing a position, creating
 * a stop-loss order or any other position action is executed, the
 * exchange returns a Payload object which should be stored and 
 * analyzed if a problem was to raise.
 */
export type IPositionActionKind = "POSITION_OPEN"|"POSITION_CLOSE";
export interface IPositionActionRecord {
    // The time in which the payload was received and stored
    t: number,

    // The kind of execution
    k: IPositionActionKind,

    // The symbol of the coin being traded
    s: string,

    // The side of the position
    sd: IBinancePositionSide,

    // The exeution payload returned by the exchange
    p: IBinanceTradeExecutionPayload
}











