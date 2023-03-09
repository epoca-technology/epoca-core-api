import { IBinancePositionActionSide, IBinancePositionSide } from "../binance";




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
 * The trading strategy makes use of 5 take profit levels that have different
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
     * Profit Optimization Strategy
     * When a position is opened, a take profit grid is generated. Each level
     * activates when hit by the spot price. The position is maintained active
     * until the gain experiences a drawdown that goes past the level's tolerance.
     */
    take_profit_1: ITakeProfitLevel,
    take_profit_2: ITakeProfitLevel,
    take_profit_3: ITakeProfitLevel,

    /**
     * Loss Optimization Strategy
     * Each position has a fixed price in which it will be closed no matter what.
     * Furthermore, when a position is at loss, it has a max hp drawdown% limit 
     * which can trigger before the market hits the stop loss price.
     */
    stop_loss: number
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






