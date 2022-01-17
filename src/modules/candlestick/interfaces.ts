import { IBinanceCandlestick, IBinanceCandlestickInterval } from "../shared/binance";




export interface ICandlestickService {
    // Candlesticks Configuration
    standardConfig: ICandlestickConfig,
    forecastConfig: ICandlestickConfig,

    // Testing
    testMode: boolean,

    // Candlestick Retrievers
    get(start?: number, end?: number, limit?: number, forecast?: boolean): Promise<ICandlestick[]>,
    getLastOpenTimestamp(forecast?: boolean): Promise<number>,
    getLast(forecast?: boolean, limit?: number): Promise<ICandlestick[]>,
    getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]>,

    // Candlestick Syncing & Saving
    initializeSync(): Promise<void>,
    syncCandlesticks(): Promise<ICandlestick[]>,
    saveCandlesticks(candlesticks: ICandlestick[], forecast?: boolean): Promise<void>,

    // Helpers
    alterInterval(candlesticks1m: ICandlestick[], intervalMinutes: number): ICandlestick[],
    processBinanceCandlesticks(candlesticks: IBinanceCandlestick[]): ICandlestick[],
}






// Validations
export interface ICandlestickValidations {
    canGetForPeriod(start: number, end: number, intervalMinutes: number): void
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
    tbv: number,                // Taker Buy Volume (USDT)
    nt: number,                 // Number of Trades
}





// Candlestick Type
export interface ICandlestickConfig {
    intervalMinutes: number,
    alias: IBinanceCandlestickInterval,
    table: string,
    testTable: string,
}