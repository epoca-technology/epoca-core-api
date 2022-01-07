import { IBinanceCandlestick } from "../shared/binance";




export interface ICandlestickService {
    // Properties
    genesisCandlestickTimestamp: number,
    testMode: boolean,

    // Candlestick Retrievers
    getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]>,
    get(start?: number, end?: number): Promise<ICandlestick[]>,
    getLastOpenTimestamp(): Promise<number>,
    getLast(limit?: number): Promise<ICandlestick[]>,

    // Candlestick Syncing & Saving
    initializeSync(): Promise<void>,
    saveCandlesticksFromStart(startTimestamp: number): Promise<ICandlestick[]>,
    saveCandlesticks(candlesticks: ICandlestick[]): Promise<void>,

    // Helpers
    alterInterval(candlesticks1m: ICandlestick[], intervalMinutes: number): ICandlestick[],
    processBinanceCandlesticks(candlesticks: IBinanceCandlestick[]): ICandlestick[],
}







// Candlestick Record
export interface ICandlestick {
    ot: number,                 // Open Time
    ct: number,                 // Close Time
    o: number,                  // Open Price
    h: number,                  // High Price
    l: number,                  // Low Price
    c: number,                  // Close Price
    v: number,                  // Volume (USDT)
}