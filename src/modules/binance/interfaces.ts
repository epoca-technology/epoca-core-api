

// Service
export interface IBinanceService {
    // Properties
    candlestickGenesisTimestamp: number,

    /* FUTURES SIGNED ENDPOINTS */


    // Retrievers
    getBalances(): Promise<IBinanceBalance[]>,
    getActivePositions(): Promise<IBinanceActivePosition[]>,

    // Position Actions
    order(
        symbol: string,
        actionSide: IBinancePositionActionSide, 
        quantity: number,
        stopPrice?: number,
    ): Promise<IBinanceTradeExecutionPayload|undefined>,


    /* FUTURES PUBLIC ENDPOINTS */
    getExchangeInformation(): Promise<IBinanceExchangeInformation>,
    getCoinTickers(): Promise<IBinanceCoinTicker[]>,


    /* SPOT PUBLIC ENDPOINTS */
    getCandlesticks(
        interval?: IBinanceCandlestickInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<IBinanceCandlestick[]>,
    getOrderBook(): Promise<IBinanceOrderBook>,
}












/***************************
 * BINANCE FUTURES ACCOUNT *
 ***************************/





/* BALANCE */


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








/* POSITIONS */



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

    // @TODO ?
    positionSide: "BOTH",

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
    type: "MARKET", // <- Evaluate this
    reduceOnly: boolean,
    side: IBinancePositionActionSide,
    stopPrice: string,
    workingType: string, // e.g: CONTRACT_PRICE
    priceProtect: boolean,
    origType: string,
    updateTime: number  // e.g: 1669767816395
}








/**************************
 * BINANCE FUTURES PUBLIC *
 **************************/






/**
 * Binance Exchange Information
 * Binance offers an endpoint in which exposes general information, 
 * such as, global configurations, supported symbols, etc.
 */
export interface IBinanceExchangeInformation {
    timezone: string, // "UTC"
    serverTime: number, // 1678870837278
    futuresType: string, // "U_MARGINED"
    rateLimits: Array<{
        rateLimitType: "REQUEST_WEIGHT"|"ORDERS",
        interval: "MINUTE"|"SECOND",
        intervalNum: number,
        limit: number
    }>,
    exchangeFilters: any[],
    assets: Array<{
        asset: string, // Base Symbol. F.e: "BTC"|"USDT"|"BNB"...
        marginAvailable: boolean,
        autoAssetExchange: string, // "-10000"|"-0.00100000"|"-10"|"-5"...
    }>,
    symbols: Array<IBinanceExchangeInformationSymbol>
}
export interface IBinanceExchangeInformationSymbol {
    symbol: string, // "BTCUSDT"
    pair: string, // "BTCUSDT"
    contractType: "PERPETUAL"|"CURRENT_QUARTER"|"", // Only PERPETUAL contracts should be supported
    deliveryDate: number, // 4133404800000
    onboardDate: number, // 4133404800000
    status: "TRADING"|"SETTLING"|"PENDING_TRADING", // Only TRADING contracts should be supported
    maintMarginPercent: string, // "2.5000"
    requiredMarginPercent: string, // "5.0000"
    baseAsset: string, // "BTC"|"ETH"|"BCH"
    quoteAsset: "USDT"|"BUSD", // Only USDT based contracts should be supported
    marginAsset: "USDT"|"BUSD", // Only USDT based contracts should be supported
    pricePrecision: number, // 2
    quantityPrecision: number, // 3
    baseAssetPrecision: number, // 8
    quotePrecision: number, // 8
    underlyingType: "COIN"|"INDEX", // Only COIN based contracts should be supported
    underlyingSubType: Array<string>, // "Layer-1"|"Layer-2"|"DeFi"|"DEX"|"Meme"...
    settlePlan: number, // 0
    triggerProtect: string, // "0.0500"
    liquidationFee: string, // "0.012500"
    marketTakeBound: string, // "0.05"
    filters: Array<IBinanceExchangeInformationSymbolFilter>,
    orderTypes: Array<IBinanceExchangeInformationSymbolOrderType>,
    timeInForce: Array<IBinanceExchangeInformationSymbolTimeInForce>
}
export interface IBinanceExchangeInformationSymbolFilter {
    filterType: IBinanceExchangeInformationSymbolFilterType,
    minPrice?: string,  // 	"39.86"
    maxPrice?: string,  // 	"306177"
    tickSize?: string,  // "0.01"
    stepSize?: string, // "0.001"
    maxQty?: string, // "10000"
    minQty?: string, // "10000"
    limit?: number, // 200
    notional?: number, // "5"
    multiplierDown?: string, // "0.9500"
    multiplierUp?: string, // "1.0500"
    multiplierDecimal?: string, // "4"
}
export type IBinanceExchangeInformationSymbolFilterType = "PRICE_FILTER"|"LOT_SIZE"|"MARKET_LOT_SIZE"|"MAX_NUM_ORDERS"|"MAX_NUM_ALGO_ORDERS"|"MIN_NOTIONAL"|"PERCENT_PRICE";
export type IBinanceExchangeInformationSymbolOrderType = "LIMIT"|"MARKET"|"STOP"|"STOP_MARKET"|"TAKE_PROFIT"|"TAKE_PROFIT_MARKET"|"TRAILING_STOP_MARKET";
export type IBinanceExchangeInformationSymbolTimeInForce = "GTC"|"IOC"|"FOK"|"GTX";









/**
 * Coin 24h Ticker
 * Binance Futures API exposes the tickers for all the supported symbols
 * which can be used to determine the quality of each coin based on their
 * volume.
 */
export interface IBinanceCoinTicker {
    symbol: string, // "BALUSDT"
    priceChange: string, // "-0.347"
    priceChangePercent: string, // "-5.124"
    weightedAvgPrice: string, // "6.651"
    lastPrice: string, // "6.425"
    lastQty: string, // "5.9"
    openPrice: string, // "6.772"
    highPrice: string, // "6.911"
    lowPrice: string, // "6.354"
    volume: string, // "3562627.4"
    quoteVolume: string, // "23696682.000" <- Use this value
    openTime: number, // 1679863500000
    closeTime: number, // 1679949919335
    firstId: number, // 114569674
    lastId: number, // 114737810
    count: number // 168137
}












/****************************************
 * BINANCE FUTURES PUBLIC WEBSOCKER API *
 ****************************************/


/**
 * Mark Price Stream Data Item
 * The mark price stream broadcasts list of objects following this schema.
 * Note that the mark price (p) and the current timestamp (E) can be extracted
 * from each object.
 */
export interface IMarkPriceStreamDataItem {
    e: string, // Event type. E.g: "markPriceUpdate"
    E: number, // Event timestamp in ms
    s: string, // Symbol. E.g: "BTCUSDT"
    p: string, // Mark price. E.g: "24968.00000000"
    P: string, // Estimated Settle Price, only useful in the last hour before the settlement starts. E.g: "24985.00926676"
    i: string, // Index price. E.g: "24978.91045170"
    r: string, // Funding Rate. E.g: "0.00003171"
    T: number  // Next funding time
}
















/********************
 * SPOT MARKET DATA *
 ********************/









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






