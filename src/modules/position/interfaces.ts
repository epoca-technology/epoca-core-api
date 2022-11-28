import { IBinancePositionSide } from "../binance";




// Service
export interface IPositionService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Position Retrievers
    getSummary(): IPositionSummary,

    // Position Actions
    openPosition(side: IBinancePositionSide): Promise<void>,
    increasePosition(side: IBinancePositionSide): Promise<void>,
    closePosition(side: IBinancePositionSide): Promise<void>,

    // Position Strategy
    updateStrategy(newStrategy: IPositionStrategy): Promise<void>
}




// Validations
export interface IPositionValidations {
    // Position Retrievers


    // Position Management
    canInteractWithPositions(side: IBinancePositionSide): void,

    // Position Strategy
    canStrategyBeUpdated(
        newStrategy: IPositionStrategy, 
        activeLong: IActivePosition|undefined, 
        activeShort: IActivePosition|undefined
    ): void
}




// Model
export interface IPositionModel {

    


    
    // Position Strategy
    getStrategy(): Promise<IPositionStrategy|undefined>,
    createStrategy(strategy: IPositionStrategy): Promise<void>,
    updateStrategy(strategy: IPositionStrategy): Promise<void>
}




// Notifications
export interface IPositionNotifications {
    onActivePositionRefresh(
        long: IActivePosition|undefined, 
        short: IActivePosition|undefined
    ): Promise<void>
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
 * Strategy Level
 * Each level details how much money should be placed into the 
 * position, as well as a target in order to take profit / reduce
 * losses.
 */
export interface IPositionStrategyLevel {
    /**
     * The USDT wallet balance that will be placed into the position. When 
     * level 1 is activated, the position is opened. When any subsequent level
     * is activated, the position is increased instead.
     */
    size: number,

    /**
     * The price percentage change from the entry price required
     * in order for the position to be closeable. Keep in mind this value may be 0.
     */
    target: number
}




/**
 * Strategy 
 * Levels are activated in a chained manner and must meet
 * a series of requirements in order to ensure the safety of the 
 * funds.
 */
export interface IPositionStrategy {
    // The leverage that will be used on positions
    leverage: number,

    /**
     * The percentage change the price needs to experience in order to be able to 
     * increase the position's level.
     */
    level_increase_requirement: number,

    // Levels
    level_1: IPositionStrategyLevel,
    level_2: IPositionStrategyLevel,
    level_3: IPositionStrategyLevel,
    level_4: IPositionStrategyLevel,

    // The timestamp in which the strategy was last updated
    ts: number
}




/**
 * Position Strategy State
 * The state of the strategy allows to easily calculate
 * targets and increase sizes.
 */
export interface IPositionStrategyState {
    current: IPositionStrategyLevel,
    next: IPositionStrategyLevel|undefined
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
    target_price: number,

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

