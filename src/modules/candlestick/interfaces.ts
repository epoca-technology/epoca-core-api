import { IBinanceCandlestick, IBinanceCandlestickInterval } from "../shared/binance";




export interface ICandlestickService {
    // Candlesticks Configuration
    standardConfig: ICandlestickConfig,
    forecastConfig: ICandlestickConfig,

    // Testing
    testMode: boolean,

    // Candlestick Retrievers
    getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]>,
    get(start?: number, end?: number, forecast?: boolean): Promise<ICandlestick[]>,
    getLastOpenTimestamp(forecast?: boolean): Promise<number>,

    // Candlestick Syncing & Saving
    initializeSync(): Promise<void>,
    syncCandlesticks(startTimestamp?: number): Promise<ICandlestickPayload>,
    saveCandlesticks(candlesticks: ICandlestick[], forecast?: boolean): Promise<void>,

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





// Candlestick Type
export interface ICandlestickConfig {
    interval: number,
    alias: IBinanceCandlestickInterval,
    genesis: number,
    table: string,
    testTable: string,
    localLimit: number
}




// Candlestick Sync Payload
export interface ICandlestickPayload {
    standard: ICandlestick[], 
    forecast: ICandlestick[], 
}