import { IBinancePositionActionSide, IBinancePositionSide } from "../binance";




// Service
export interface IPositionService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Position Retrievers
    getSummary(): IPositionSummary,

    // Position Actions
    openPosition(side: IBinancePositionSide): Promise<void>,
    closePosition(side: IBinancePositionSide, chunkSize: number): Promise<void>,

    // Position Strategy
    updateStrategy(newStrategy: IPositionStrategy): Promise<void>,

    // Position Trades
    listTrades(startAt: number, endAt: number): Promise<IPositionTrade[]>
}




// Validations
export interface IPositionValidations {
    // Position Management
    canOpenPosition(
        side: IBinancePositionSide, 
        position: IActivePosition|undefined, 
        positionSize: number, 
        availableBalance: number
    ): void,
    canClosePosition(
        side: IBinancePositionSide, 
        position: IActivePosition|undefined, 
        chunkSize: number
    ): void,

    // Position Strategy
    canStrategyBeUpdated(currentStrategy: IPositionStrategy, newStrategy: IPositionStrategy): void,

    // Position Trades
    canTradesBeListed(startAt: number, endAt: number): void
}




// Health
export interface IPositionHealth {
    // Properties
    long: IPositionSideHealth|null,
    short: IPositionSideHealth|null,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Health Calculator
    refreshHealth(
        long: IActivePosition|undefined,
        short: IActivePosition|undefined,
        spotPrice: number,
        minGain: number
    ): Promise<void>,

    // Health Candlesticks
    getPositionHealthCandlesticks(side: IBinancePositionSide): Promise<IPositionHealthCandlestickRecord[]>
}





// Model
export interface IPositionModel {
    // Position Strategy
    getStrategy(): Promise<IPositionStrategy|undefined>,
    createStrategy(strategy: IPositionStrategy): Promise<void>,
    updateStrategy(strategy: IPositionStrategy): Promise<void>,

    // Position Health
    getHealth(): Promise<IPositionHealthState|undefined>,
    createHealth(health: IPositionHealthState): Promise<void>,
    updateHealth(health: IPositionHealthState): Promise<void>,

    // Position Health Candlesticks
    getPositionHealthCandlesticks(side: IBinancePositionSide): Promise<IPositionHealthCandlestickRecord[]>,
    cleanPositionHealthCandlesticks(side: IBinancePositionSide): Promise<void>,
    savePositionHealthCandlestick(side: IBinancePositionSide, record: IPositionHealthCandlestickRecord): Promise<void>,

    // Position Trades
    listTrades(startAt: number, endAt: number): Promise<IPositionTrade[]>,
    saveTrades(trades: IPositionTrade[]): Promise<void>,
    getLastTradeTimestamp(): Promise<number|undefined>
}




// Notifications
export interface IPositionNotifications {
    // On Position Refresh
    onActivePositionRefresh(
        long: IActivePosition|undefined, 
        short: IActivePosition|undefined
    ): Promise<void>,

    // On Position Action
    onNewPosition(side: IBinancePositionSide, margin: number, amount: number): Promise<void>,
    onPositionClose(position: IActivePosition, chunkSize: number): Promise<void>,
    onNewCandlesticksError(error: any): Promise<void>,
    onNewSignalError(error: any): Promise<void>
}












/********************
 * Position Summary *
 ********************/







/**
 * Position Summary
 * This object contains all the relevant information regarding
 * the futures account.
 */
export interface IPositionSummary {
    // Futures Account Balance
    balance: IAccountBalance,

    // The current strategy
    strategy: IPositionStrategy,

    // The active long position. If none is, it will be undefined
    long: IActivePosition|undefined,

    //The active short position. If none is, it will be undefined
    short: IActivePosition|undefined,

    // The current active position's health
    health: IPositionHealthState
}

















/*********************
 * Position Strategy *
 *********************/




/**
 * Take Profit Level
 * The trading strategy makes use of 5 take profit levels that have different
 * characteristics.
 */
export interface ITakeProfitLevel {
    // The price percentage change from the entry price for the level to be active
    price_change_requirement: number,

    /**
     * The maximum HP Drawdown% allowed in the level. If this requirement is not met, 
     * the position is closed.
     */
    max_hp_drawdown: number,

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
     * Each side has its own status. When enabled and a matching prediction
     * is generated, it will open a position.
     */
    long_status: boolean,
    short_status: boolean,

    /**
     * Hedge Mode
     * If this option is enabled, the model can open a long and a short
     * simultaneously. Otherwise, it will only handle 1 active position at
     * a time.
     */
    hedge_mode: boolean,

    // The leverage that will be used on positions
    leverage: number,

    /**
     * Position Size
     * The amount of money allocated to the position will always be 
     * the same, no matter the side. If there isn't enough balance
     * to cover the size, the position cannot be opened.
     */
    position_size: number,

    /**
     * Profit Optimization Strategy
     * When a position is opened, a take profit grid is generated. Each level
     * activates when hit by the spot price. The position is maintained active
     * until the HP experiences a drawdown that goes past the level's tolerance.
     * Additionally, a global max hp drawdown can be assigned to be triggered
     * when the position is at break-even or small profits.
     */
    take_profit_1: ITakeProfitLevel,
    take_profit_2: ITakeProfitLevel,
    take_profit_3: ITakeProfitLevel,
    take_profit_4: ITakeProfitLevel,
    take_profit_5: ITakeProfitLevel,
    max_hp_drawdown_in_profit: number,

    /**
     * Loss Optimization Strategy
     * Each position has a fixed price in which it will be closed no matter what.
     * Furthermore, when a position is at loss, it has a max hp drawdown% limit 
     * which can trigger before the market hits the stop loss price.
     */
    stop_loss: number,
    max_hp_drawdown_in_loss: number,

    /**
     * Idle
     * When a position is closed, the model remains idle for idle_minutes 
     * before being able to open more positions.
     * A side can open a position as long as: 
     * state == true && current_time > idle_until
     */
    long_idle_minutes: number,
    long_idle_until: number,
    short_idle_minutes: number,
    short_idle_until: number,

    // The timestamp in which the strategy was last updated
    ts: number
}


/**
 * Position Exit Strategy
 * The exit prices calculated every time a position is refreshed based on the strategy.
 */
export interface IPositionExitStrategy {
    // Take Profits by Level
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,
    take_profit_price_4: number,
    take_profit_price_5: number,

    // Stop Loss
    stop_loss_price: number
}















/*******************
 * Position Health *
 *******************/



/**
 * Position Health State
 * Contains the current HP details for both sides. If there is no
 * active position for a side, it will be null.
 */
export interface IPositionHealthState {
    long: IPositionSideHealth|null,
    short: IPositionSideHealth|null,
}



/**
 * Position Side Health
 * The object containing all the relevant information regarding an
 * active position on a specific side.
 */
export interface IPositionSideHealth {
    // Timestamp: the date in which the position was opened (Inexact)
    ts: number,

    // Open Sum: the prediction sum when the position was opened
    os: number,

    // Open Open Interest: the open interest value when the position was opened.
    ooi: number,

    // Open Long/Short Ratio: the long/short ratio value when the position was opened.
    olsr: number,

    /**
     * Health Points
     * When a position is opened, the initial HP is stored. More over,
     * as time goes on, it constantly updates the highest and lowest
     * HP values recorded. The points specific properties are:
     */
    ohp: number, // Open Health Points: the HP when the position was opened.
    hhp: number, // Highest Health Points: the highest HP the position has reached.
    lhp: number, // Lowest Health Points: the lowest HP the position has reached.
    chp: number, // Current Health Points: the current HP count.

    /**
     * Drawdown
     * The drawdown is the percentage change between the highest hp and the
     * current hp. If the current hp is equals to the highest hp, the drawdown
     * is equals to 0.
     */
    dd: number,

    /**
     * The highest gain% and the gain drawdown% calculated only when a position
     * is profitable. Otherwise it is 0.
     */
    mg: number,
    mgdd: number
}




/**
 * Position Health Weights
 * In order to determine the health of a position, the weights for 
 * each factor must be assigned.
 */
export interface IPositionHealthWeights {
    // The initial trend sum value versus the current one
    trend_sum: number,

    // The direction of the trend sum
    trend_state: number,

    // The state of the technical analysis indicators
    ta_30m: number,
    ta_1h: number,
    ta_2h: number,
    ta_4h: number,
    ta_1d: number,

    // The initial open interest value versus the current one 
    open_interest: number,

    // The state of the open interest within the market state window
    open_interest_state: number,

    // The initial long/short ratio value versus the current one 
    long_short_ratio: number,

    // The state of the long/short ratio within the market state window
    long_short_ratio_state: number,

    // The state of the direction in which the price is being driven by the volume
    volume_direction: number
}






/* Position Health Candlesticks */



/**
 * Position Health Candlestick
 * The final object used to display the position health candlesticks.
 */
export interface IPositionHealthCandlestick {
    // Open Timestamp: the time in which the candlestick was first built
    ot: number,

    // Open: the HP|HP Drawdown%|Gain Drawdown% when the candlestick was first built
    o: number,

    // High: the highest HP|HP Drawdown%|Gain Drawdown% in the candlestick
    h: number,

    // Low: the lowest HP|HP Drawdown%|Gain Drawdown% in the candlestick
    l: number,

    // Close: the last HP|HP Drawdown%|Gain Drawdown% in the candlestick 
    c: number
}





/**
 * Active Candlestick
 * The position health builds the candlesticks in RAM and stores them
 * once they are closed based on the interval. 
 * The system builds the following:
 * 1) HP History Candlesticks
 * 2) HP Max Drawdown% History Candlesticks
 * 3) Max Gain Drawdown% History Candlesticks
 * In order to facilitate the interaction with this data, when active,
 * the data is handled separately and is only combined when stored.
 */
export interface IPositionHealthActiveCandlestick {
    // The time at which the candlestick first came into existance
    ot: number|undefined,

    // The HP Candlestick
    hp: Partial<IPositionHealthCandlestick>|undefined,

    // The HP Drawdown% Candlestick
    dd: Partial<IPositionHealthCandlestick>|undefined,

    // The Gain Drawdown% Candlestick
    mgdd: Partial<IPositionHealthCandlestick>|undefined
}





/**
 * Position Health Candlestick Record
 * The record in which the candlesticks are stored in the database.
 * The lists must follow the indexes:
 * 0 = HP
 * 1 = HP Drawdown%
 * 2 = Gain Drawdown%
 */
export interface IPositionHealthCandlestickRecord {
    // The time at which the candlestick first came into existance
    ot: number,

    // The candlesticks' data
    d: {
        // Open Value: HP, HP Drawdown%, Gain Drawdown%
        o: [number, number, number],

        // High Value: HP, HP Drawdown%, Gain Drawdown%
        h: [number, number, number],

        // Low Value: HP, HP Drawdown%, Gain Drawdown%
        l: [number, number, number],

        // Close Value: HP, HP Drawdown%, Gain Drawdown%
        c: [number, number, number]
    }
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






/**
 * Active Position
 * The active position including all the details in order to measure
 * risks and visualize targets.
 */
export interface IActivePosition {
    // The type of position "LONG"|"SHORT".
    side: IBinancePositionSide,

    // The weighted entry price based on all the trades within the position.
    entry_price: number,

    // The mark price when the active positions were updated.
    mark_price: number,

    // The prices at which each level is activated
    take_profit_price_1: number,
    take_profit_price_2: number,
    take_profit_price_3: number,
    take_profit_price_4: number,
    take_profit_price_5: number,

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









/**
 * Position Trade
 * A position can have 1 or many trades. The limit is established
 * in the strategy.
 */
export interface IPositionTrade {
    /**
     * The identifier of the trade. Due to lack of knowledge regarding
     * Binance internals, the identifier of the trade will follow the format:
     * id_orderId -> '245986349_3256128709'
     * In case either of the values is not provided by Binance, they will be 
     * replaced with NA. For example:
     * 'NA_3256128709'|'245986349_NA'|'NA_NA'
     * Since the given identifier is not reliable, it should be used as a 
     * primary key. Moreover, the 't' property must be indexed.
     */
    id: string,

    // The time in milliseconds at which the trade was executed
    t: number, // Timestamp

    /**
     * The action side of the trade. Used to identify if a position was 
     * opened, increased or closed.
     */
    s: IBinancePositionActionSide, // Side

    // The type of position that holds the trade
    ps: IBinancePositionSide, // Position Side

    // The price at which the trade was executed
    p: number, // Price

    // The amount of Bitcoin that was traded
    qty: number, // Quantity

    // The amount of USDT that was traded
    qqty: number, // Quote Quantity

    /**
     * The profit or loss generated by the trade. If the trade is not a 
     * closer, this value will be equals to 0.
     */
    rpnl: number, // Realized PNL

    /**
     * The fee charged by the exchange in order to execute the trade
     */
    c: number // Comission
}