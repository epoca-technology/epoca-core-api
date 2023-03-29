import { IBinanceMarginType, IBinancePositionActionSide, IBinancePositionSide } from "../binance";
import { ICoin } from "../market-state";




// Service
export interface IPositionService {
    // Properties
    strategy: IPositionStrategy,
    active: IActivePosition|null,
    balance: IAccountBalance,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Position Strategy
    updateStrategy(newStrategy: IPositionStrategy): Promise<void>
}




// Validations
export interface IPositionValidations {
    // Position Strategy
    canStrategyBeUpdated(newStrategy: IPositionStrategy): void,

}







// Model
export interface IPositionModel {
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

    /**
     * Loss Optimization Strategy
     * When a position is opened, a stop-loss-market order is created which will be
     * triggered the moment it is hit by the Mark Price. Additionally, the system 
     * also monitors the stop loss at a native level and closes it if for any
     * reason it hasn't been.
     */
    stop_loss: number
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

    // Stop Loss
    stop_loss_price: number
}



















/*******************
 * BINANCE ACCOUNT *
 *******************/






/**
 * Account Balance
 * In Epoca, the balance is always referring to USDT and is always extracted
 * fresh from Binance's API.
 */
export interface IAccountBalance {
    // The available balance in the account that can be used to initialize positions
    available: number,

    // The balance that has been allocated to positions (margin)
    on_positions: number,

    // The total balance in the account including unrealized pnl
    total: number,

    // The time in which the balance data was last updated by Binance
    ts: number
}









/* Account Active Position */


/**
 * Active Position
 * The active position including all the details in order to measure
 * risks and visualize targets.
 */
export interface IActivePosition {
    // The symbol of the position
    symbol: string,

    // The type of position "LONG"|"SHORT".
    side: IBinancePositionSide,

    // The leverage used in the position.
    leverage: number,

    // The type of margin in which the position was opened. Always should be "isolated".
    margin_type: IBinanceMarginType,

    // The weighted entry price based on all the trades within the position.
    entry_price: number,

    // The mark price when the active positions were updated.
    mark_price: number,

    // The prices at which each level is activated
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,

    // The price in which the position is labeled as "unsuccessful" and is ready to be closed.
    stop_loss_price: number,

    // The price at which the position will be automatically liquidated by the exchange.
    liquidation_price: number,

    // The current unrealized PNL in USDT
    unrealized_pnl: number,

    // The current return on equity
    roe: number,

    // The total margin (USDT) put into the position.
    isolated_wallet: number,

    // The current value of the isolated_wallet + unrealized_pnl.
    isolated_margin: number,

    // The size of the position in BTC with leverage included.
    position_amount: number,

    // The size of the position in USDT with leverage included.
    notional: number,

    // The timestamp in ms at which the position was updated.
    ts: number
}




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

    // The % the price has moved in favor or against. If losing, the value will be a negative number
    gain: number,

    /**
     * The highest gain recorded as well as the drawdown from that point. These values will be 0 
     * if no TP level has been activated
     */
    highest_gain: number,
    gain_drawdown: number,

    // The price in which the position is labeled as "unsuccessful" and is ready to be closed.
    stop_loss_price: number,

    /**
     * The stop-loss order currently shielding the position. If it hasn't been created, this value will 
     * be undefined.
     */
    stop_loss_order: object|undefined,




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
    ot: number|undefined,

    // The candlestick containing the Mark Price history within the interval
    markPrice: Partial<IPositionCandlestick>|undefined,

    // The candlestick containing the Gain% history within the interval
    gain: Partial<IPositionCandlestick>|undefined,

    // The candlestick containing the Gain Drawdown% history within the interval
    gainDrawdown: Partial<IPositionCandlestick>|undefined
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