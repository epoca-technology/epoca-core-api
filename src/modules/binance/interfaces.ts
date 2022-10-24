

// Service
export interface IBinanceService {
    // Properties
    candlestickGenesisTimestamp: number,



    // PUBLIC ENDPOINTS


    // Market Data
    getCandlesticks(
        interval?: IBinanceCandlestickInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<IBinanceCandlestick[]>,
    getOrderBook(limit?:number): Promise<IBinanceOrderBook>
}





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
    E: number, // -> Message output time E represents the time a certain data was pushed out from the server
    T: number, // -> The transaction time T records the time that the data (e.g. account, order related) got updated

    // Order Book Bids - Buy Orders
    bids: Array<Array<string>>,

    // Order Book Asks - Sell Orders
    asks: Array<Array<string>>,
}