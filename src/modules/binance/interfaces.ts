

// Service
export interface IBinanceService {
    // Properties
    candlestickGenesisTimestamp: number,

    /* SIGNED ENDPOINTS */


    // Retrievers
    getBalances(): Promise<IBinanceBalance[]>,
    getActivePosition(): Promise<IBinanceActivePosition|undefined>,

    // Position Actions
    order(
        actionSide: IBinancePositionActionSide, 
        positionSide: IBinancePositionSide, 
        quantity: number
    ): Promise<IBinanceTradeExecutionPayload|undefined>,




    /* SPOT PUBLIC ENDPOINTS */
    getCandlesticks(
        interval?: IBinanceCandlestickInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<IBinanceCandlestick[]>,
    getOrderBook(): Promise<IBinanceOrderBook>,


    /* FUTURES PUBLIC ENDPOINTS */
    getOpenInterest(): Promise<IBinanceOpenInterest[]>,
    getLongShortRatio(kind: IBinanceLongShortRatioKind): Promise<IBinanceLongShortRatio[]>,
}





/*******************
 * Binance Futures *
 *******************/





/* Balance */


/**
 * Futures Balance
 * The schema for an asset's future balance. The available, on_positions and 
 * total balance can be derived from this object.
 */
export interface IBinanceBalance {
    // Unique account code.
    accountAlias: string, // E.g: 'FzSgAuXqFzSgTi'

    // Asset name.
    asset: string, // E.g: 'USDT'

    // Wallet balance.
    balance: string, // E.g: '14999.95273379'

    // Crossed wallet balance.
    crossWalletBalance: string, // E.g: '14958.52189845'

    // Unrealized profit of crossed positions.
    crossUnPnl: string, // E.g: '0.00000000'

    // Available balance.
    availableBalance: string, // E.g: '14958.52189845'

    // Maximum amount for transfer out.
    maxWithdrawAmount: string, // E.g: '14958.52189845'

    // Whether the asset can be used as margin in Multi-Assets mode.
    marginAvailable: boolean,

    // The timestamp in ms when the balance was last updated.
    updateTime: number
}








/* Positions */



// Position Action Side
export type IBinancePositionActionSide = "BUY"|"SELL";


// Position Side
export type IBinancePositionSide = "LONG"|"SHORT";


// Margin Type
export type IBinanceMarginType = "isolated"|"cross";



/**
 * Futures Active Positions
 * Binance's API provides the ability to keep track of the state
 * for multiple active positions simultaneously.
 */
export interface IBinanceActivePosition {
    // The position's market (BTCUSDT).
    symbol: string,

    // The size of the position in BTC with leverage included.
    positionAmt: string,

    // The weighted entry price based on all the trades within the position.
    entryPrice: string,

    // The mark price when the active positions were updated.
    markPrice: string,

    // The current unrealized PNL in USDT
    unRealizedProfit: string,

    // The price at which the position will be automatically liquidated by the exchange.
    liquidationPrice: string,

    // The leverage used in the position.
    leverage: string,

    // The maximum notional (USDT w/ leverage) that can be executed in a single trade.
    maxNotionalValue: string,

    // The type of margin in which the position was opened. Always should be "isolated".
    marginType: IBinanceMarginType,

    // The current value of the isolatedWallet + Unrealized PNL.
    isolatedMargin: string,

    // @TODO -> If used, the value returned is a boolean in string format "true"|"false".
    isAutoAddMargin: string,

    // The type of position "LONG"|"SHORT".
    positionSide: IBinancePositionSide,

    // The size of the position in USDT with leverage included.
    notional: string,

    // The total margin (USDT) put into the position.
    isolatedWallet: string,

    // The timestamp in ms at which the position was updated.
    updateTime: number
}







/**
 * Position Trade Execution Payload
 * Whenever a position is interacted with, Binance's API returns
 * a payload object that should be stored.
 * Keep in mind that if the API for some reason does not return
 * this object, no error should be raised and should be handled
 * by the APIError.
 */
export interface IBinanceTradeExecutionPayload {
    symbol: string, // e.g: "BTCUSDT"
    status: string, // e.g: 'NEW'
    clientOrderId: string, // e.g: 'L6jSvEld7G5DC3QfhlV9mu'
    price: string, // e.g: '0'
    avgPrice: string, // e.g: '0.00000'
    origQty: string, // e.g: '0.018'
    executedQty: string, // e.g: '0'
    cumQty: string, // e.g: '0'
    cumQuote: string, // e.g: '0'
    timeInForce: string, // e.g: 'GTC'
    type: "MARKET",
    reduceOnly: boolean,
    side: IBinancePositionActionSide,
    stopPrice: string,
    workingType: string, // e.g: CONTRACT_PRICE
    priceProtect: boolean,
    origType: string,
    updateTime: number  // e.g: 1669767816395
}





















/***************
 * Market Data *
 ***************/






/* Candlesticks */



// Candlestick Series Intervals
export type IBinanceCandlestickInterval = "1m"|"3m"|"5m"|"15m"|"30m"|"1h"|"2h"|"4h"|"6h"|"8h"|"12h"|"1d"|"3d"|"1w"|"1M";




// Candlesticks
export type IBinanceCandlestick = [
    number,     // 0 = Open time.                       E.g. 1638122400000
    string,     // 1 = Open.                            E.g. "53896.36000000"
    string,     // 2 = High.                            E.g. "54186.17000000"
    string,     // 3 = Low.                             E.g. "53256.64000000"
    string,     // 4 = Close                            E.g. "54108.99000000"
    string,     // 5 = Volume                           E.g. "2958.13310000"
    number,     // 6 = Close time                       E.g. 1638125999999
    string,     // 7 = Quote asset volume               E.g. "158995079.39633250"
    number,     // 8 = Number of trades                 E.g. 90424
    string,     // 9 = Taker buy base asset volume      E.g. "1473.57777000"
    string,     // 10 = Taker buy quote asset volume    E.g. "79236207.41530900"
    string      // Ignore.
]






/* Order Book */


// Order Book
export interface IBinanceOrderBook {
    // Binance Internals
    lastUpdateId: number,

    // Order Book Asks - Sell Orders
    asks: Array<[
        string, // Price
        string  // BTC Quantity
    ]>,

    // Order Book Bids - Buy Orders
    bids: Array<[
        string, // Price
        string  // BTC Quantity
    ]>
}








/* Open Interest */


// Open Interest Record
export interface IBinanceOpenInterest {
    // The interest's symbol.
    symbol: string,

    // The total interest value in BTC.
    sumOpenInterest: string,

    // The total interest value in USDT.
    sumOpenInterestValue: string, // <- Value to be used

    // The time at which the interval started.
    timestamp: number
}







/* Long/Short Ratio  */


// The kind of long/short ratio to be extracted from the API
export type IBinanceLongShortRatioKind = "topLongShortAccountRatio"|"topLongShortPositionRatio"|"globalLongShortAccountRatio";


// Long/Short Ratio Record
export interface IBinanceLongShortRatio {
    // The market's symbol.
    symbol: string,

    // The % of futures traders who are longing.
    longAccount: string,

    // The % of futures traders who are shorting.
    shortAccount: string,

    /**
     * The ratio of longs vs shorts. If it is higher than 1, means 
     * there are more traders longing. If it is less than one means there 
     * are more traders shorting.
     */
    longShortRatio: string, // <- Value to be used

    // The time at which the interval started.
    timestamp: number
}