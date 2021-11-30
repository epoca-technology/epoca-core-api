/**
 * Server Symbols
 */

 export const SYMBOLS: ISymbols = {




    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Utilities
    UtilitiesService: Symbol.for("UtilitiesService"),

    // External Request
    ExternalRequest: Symbol.for("ExternalRequest"),
}

export interface ISymbols {

    BinanceService: symbol,
    UtilitiesService: symbol,
    ExternalRequest: symbol,
}








/**
 * Universal Types
 */










/* Prices */


// Candlesticks
export type ICandlestickSeries = ICandlestickSeriesItem[];
export type ICandlestickSeriesItem = [
    number,     // 0 = Open time.                       Ej: 1638122400000
    string,     // 1 = Open.                            Ej: "53896.36000000"
    string,     // 2 = High.                            Ej: "54186.17000000"
    string,     // 3 = Low.                             Ej: "53256.64000000"
    string,     // 4 = Close                            Ej: "54108.99000000"
    string,     // 5 = Volume                           Ej: "2958.13310000"
    number,     // 6 = Close time                       Ej: 1638125999999
    string?,    // 7 = Quote asset volume               Ej: "158995079.39633250"
    number?,    // 8 = Number of trades                 Ej: 90424
    string?,    // 9 = Taker buy base asset volume      Ej: "1473.57777000"
    string?,    // 10 = Taker buy quote asset volume    Ej: "79236207.41530900"
    string?     // Ignore.
]


// Price Series
export type IPriceSeries = IPriceSeriesItem[];
export type IPriceSeriesItem = [
    number, // Timestamp
    number  // Price
]









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