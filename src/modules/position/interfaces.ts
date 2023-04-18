import { ICoin } from "../market-state";
import { 
    IBinanceMarginType, 
    IBinancePositionSide, 
    IBinanceTradeExecutionPayload 
} from "../binance";





// Service
export interface IPositionService {
    // Properties
    strategy: IPositionStrategy,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Retrievers
    getActivePositionHeadlines(): IPositionHeadline[],
    getPositionRecord(id: string): Promise<IPositionRecord>,
    listPositionHeadlines(startAt: number, endAt: number): Promise<IPositionHeadline[]>,
    listPositionActionPayloads(
        kind: IPositionActionKind, 
        startAt: number, 
        endAt: number
    ): Promise<IPositionActionRecord[]>,

    // Position Actions
    closePosition(symbol: string): Promise<void>,

    // Position Strategy
    updateStrategy(newStrategy: IPositionStrategy): Promise<void>,
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
 * The trading strategy makes use of 3 take profit levels that have different
 * characteristics.
 */
export interface ITakeProfitLevel {
    // The price percentage change from the entry price for the level to be active
    price_change_requirement: number,

    /**
     * The additional %  requirement for the level to be officially "locked". A 
     * take profit level can only be broken and trigger a position close when
     * it has been locked. 
     */
    activation_offset: number

    /**
     * The maximum Gain Drawdown% allowed in the level. If this requirement is not met, 
     * the position is closed.
     */
    max_gain_drawdown: number
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
     * Bitcoin Only
     * If enabled, the system will only pick and trade BTCUSDT signals.
     */
    bitcoin_only: boolean,

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
     * Positions Limit
     * The system can handle up to 9 simultaneous positions. However, this limit can
     * be changed by the user at any time.
     */
    positions_limit: number,

    /**
     * Profit Optimization Strategy
     * When a position is opened, a take profit grid is generated. Each level
     * activates when hit by the mark price. The position is maintained active
     * until the gain experiences a drawdown that goes past the level's tolerance.
     */
    take_profit_1: ITakeProfitLevel,
    take_profit_2: ITakeProfitLevel,
    take_profit_3: ITakeProfitLevel,
    take_profit_4: ITakeProfitLevel,

    /**
     * Loss Optimization Strategy
     * When a position is opened, a stop-loss-market order is created which will be
     * triggered the moment it is hit by the Mark Price. Additionally, the system 
     * also monitors the stop loss at a native level and closes it if for any
     * reason it hasn't been.
     */
    stop_loss: number,

    /**
     * Reopen If Better Duration Minutes
     * When a position looses, the stop_loss_price is stored in RAM as well as the
     * time + reopen_if_better_duration_minutes. During this period of time, only
     * "better" positions can be opened. This functionality can be disabled by 
     * setting the value to 0.
     * "Better" stands for "Better Rate". For example, a long position is opened at 
     * 1.000 and looses at 999, for the next reopen_if_better_duration_minutes, longs
     * can only be opened if the price is < 999. On the other hand, if a short was
     * opened at 1.000 and lost at 1.001, no shorts with price < 1.001 can be opened
     * for reopen_if_better_duration_minutes.
     */
    reopen_if_better_duration_minutes: number,

    /**
     * Reopen If Better Price Adjustment
     * If the reopen functionality is active and triggered, the stop loss price will
     * be altered by the reopen_if_better_price_adjustment% according to the side. For 
     * instance: if this value is 0.25% and a long position looses, the stop loss price
     * will be decreased by 0.25% in order to ensure the following longs are in a 
     * better range than the one that recently lost for reopen_if_better_duration_minutes.
     * On the other hand, when a short looses, the price is increased by 0.25%.
     */
    reopen_if_better_price_adjustment: number,
}



/**
 * Position Exit Strategy
 * The exit prices calculated when a new position is detected.
 */
export interface IPositionExitStrategy {
    // Take Profits by Level
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,
    take_profit_price_4: number,

    // Stop Loss
    stop_loss_price: number
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

    /**
     * The percentual difference between highest_gain and gain. If 
     * gain is less than take_profit_1.price_change_requirement, this
     * value will be 0. Otherwise, it will always be a negative number.
     */
    gain_drawdown: number
}





/**
 * Stop Lossed Positions
 * When a position looses, it stores the essential data in order to ensure
 * that if a position for the side was to be re-opened, the price must be 
 * better.
 */
export interface IStopLossedPositions {
    LONG: {[symbol: string]: IStopLossedPositionBySide},
    SHORT: {[symbol: string]: IStopLossedPositionBySide},
}
export interface IStopLossedPositionBySide {
    // The price at which the position stop lossed
    price: number,

    // The time at which the stop lossed position fades away
    until: number
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

    // The price in which the position is labeled as "unsuccessful" and is ready to be closed.
    stop_loss_price: number,

    /**
     * The stop-loss order currently shielding the position. If it hasn't been created, this value will 
     * be undefined.
     */
    stop_loss_order: IBinanceTradeExecutionPayload|undefined,

    // The % the price has moved in favor or against. If losing, the value will be a negative number
    gain: number,

    /**
     * The highest gain recorded as well as the drawdown from that point. These values will be 0 
     * if no TP level has been activated
     */
    highest_gain: number,
    gain_drawdown: number,




    /* History */

    // The list of packed candlesticks that detail the position's history
    history: IPositionCandlestickRecord[]
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

    // The gain% the price has moved in favor or against. If losing, the value will be a negative number
    g: number,

    // The gain drawdown% from the highest gain
    gd: number,

    // Stop Loss Order - If the position has one, this value will be true
    slo: boolean
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

    // Open: the Mark Price|Gain%|Gain Drawdown% when the candlestick was first built
    o: number,

    // High: the highest Mark Price|Gain%|Gain Drawdown% in the candlestick
    h: number,

    // Low: the lowest Mark Price|Gain%|Gain Drawdown% in the candlestick
    l: number,

    // Close: the last Mark Price|Gain%|Gain Drawdown% in the candlestick 
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
    gain: Partial<IPositionCandlestick>,

    // The candlestick containing the Gain Drawdown% history within the interval
    gainDrawdown: Partial<IPositionCandlestick>
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
        // Open Value:  Mark Price, Gain%, Gain Drawdown%
        o: [number, number, number],

        // High Value:  Mark Price, Gain%, Gain Drawdown%
        h: [number, number, number],

        // Low Value:   Mark Price, Gain%, Gain Drawdown%
        l: [number, number, number],

        // Close Value: Mark Price, Gain%, Gain Drawdown%
        c: [number, number, number]
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











