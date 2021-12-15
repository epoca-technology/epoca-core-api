/**
 * Universal Types
 */










/**
 * Verbose Levels
 * 0: No logs
 * 1: Important logs
 * 2: All logs
 */
export type IVerbose = 0|1|2;








/* API */


// API Response
export interface IAPIResponse {
    success: boolean,
    data: any|null,
    error: IAPIError|null
}

// API Error
export interface IAPIError {
    code: number,
    message: string
}












/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {


    // Forecast
    ForecastService: Symbol.for("ForecastService"),

    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Utilities
    UtilitiesService: Symbol.for("UtilitiesService"),

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // Database Service
    DatabaseService: Symbol.for("DatabaseService"),
}

export interface ISymbols {

    ForecastService: symbol,
    BinanceService: symbol,
    UtilitiesService: symbol,
    ExternalRequestService: symbol,
    DatabaseService: symbol,
}






