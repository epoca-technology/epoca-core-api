import { IBinanceCandlestick } from "../binance";
import { ICryptoCurrencySymbol } from "../cryptocurrency";




export interface ICandlestickService {
    // Properties

    testMode: boolean,

    // Retrievers
    get(symbol: ICryptoCurrencySymbol, start?: number, end?: number): Promise<ICandlestick[]>,
    getLastOpenTimestamp(symbol: ICryptoCurrencySymbol): Promise<number>,
    getLast(symbol: ICryptoCurrencySymbol, limit?: number): Promise<ICandlestick[]>,

    // Candlestick Syncing
    
    saveCandlesticksFromStart(symbol: ICryptoCurrencySymbol, startTimestamp: number): Promise<void>,
    saveCandlesticks(candlesticks: ICandlestick[]): Promise<any>,

    // Candlesticks Proccessors
    processBinanceCandlesticks(symbol: ICryptoCurrencySymbol, candlesticks: IBinanceCandlestick[]): ICandlestick[],
}







// Candlestick Record
export interface ICandlestick {
    ot: number,                 // Open Time
    ct: number,                 // Close Time
    o: string,                  // Open Price
    h: string,                  // High Price
    l: string,                  // Low Price
    c: string,                  // Close Price
    v: string,                  // Volume (USDT)
    tbv: string,                // Taker Buy Volume (USDT)
    s?: ICryptoCurrencySymbol   // Cryptocurrency Symbol - Only present when adding the record to the db
}