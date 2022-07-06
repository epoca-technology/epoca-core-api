import { BehaviorSubject } from "rxjs";
import { IBinanceCandlestickInterval } from "../binance";



// Service
export interface ICandlestickService {
    // Real Time Candlesticks Stream
    stream: BehaviorSubject<ICandlestickStream>,

    // Candlestick Retrievers
    getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]>,

    // Candlestick Syncing
    initialize(): Promise<void>,
    stop(): void,

    // Stream
    isStreamInSync(stream: ICandlestickStream): boolean,
}




// Model
export interface ICandlestickModel {
    // Candlesticks Configuration
    standardConfig: ICandlestickConfig,
    predictionConfig: ICandlestickConfig,

    // Candlestick Retrievers
    get(start?: number, end?: number, limit?: number, forecast?: boolean): Promise<ICandlestick[]>,
    getLastOpenTimestamp(forecast?: boolean): Promise<number>,
    getLast(forecast?: boolean, limit?: number): Promise<ICandlestick[]>,

    // Candlestick Saving
    saveCandlesticks(candlesticks: ICandlestick[], forecast?: boolean): Promise<void>,

    // Candlestick Merging
    alterInterval(candlesticks1m: ICandlestick[], intervalMinutes: number): ICandlestick[],
    mergeCandlesticks(candlesticks: ICandlestick[]): ICandlestick,

    // Misc Helpers
    getPredictionCandlestickCloseTime(ot: number): number,
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
    v: number                   // Volume (USDT)
}





// Candlestick Config
export interface ICandlestickConfig {
    intervalMinutes: number,
    alias: IBinanceCandlestickInterval
}




// Candlesticks stream
export interface ICandlestickStream {
    lastUpdate: number,
    candlesticks: ICandlestick[],
    error?: string
}