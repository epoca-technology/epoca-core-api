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




// Model
export interface IPositionModel {
    // Position Strategy
    getStrategy(): Promise<IPositionStrategy|undefined>,
    createStrategy(strategy: IPositionStrategy): Promise<void>,
    updateStrategy(strategy: IPositionStrategy): Promise<void>,

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
    short: IActivePosition|undefined
}







/* Position Strategy */



/**
 * Strategy 
 * The configuration that handles the core position entry and exit flow.
 */
export interface IPositionStrategy {
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
     * Position Status
     * Each side has its own status. When enabled and a matching prediction
     * is generated, it will open a position.
     */
    long_status: boolean,
    short_status: boolean,

    /**
     * Position Exit Combination
     * Every position 
     */
    take_profit: number,
    stop_loss: number,

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










/* BINANCE ACCOUNT */




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

    // The price in which the position is labeled as "successful" and is ready to be closed.
    take_profit_price: number,

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