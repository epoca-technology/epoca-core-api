/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {
    // Forecast
    ForecastService: Symbol.for("ForecastService"),

    // Candlestick
    CandlestickService: Symbol.for("CandlestickService"),
    CandlestickValidations: Symbol.for("CandlestickValidations"),

    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Utilities
    UtilitiesService: Symbol.for("UtilitiesService"),

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // Database
    DatabaseService: Symbol.for("DatabaseService"),

    // Validations
    ValidationsService: Symbol.for("ValidationsService"),

    // Server
    ServerService: Symbol.for("ServerService"),
    ServerValidations: Symbol.for("ServerValidations"),
}


export interface ISymbols {
    ForecastService: symbol,
    CandlestickService: symbol,
    CandlestickValidations: symbol,
    BinanceService: symbol,
    UtilitiesService: symbol,
    ExternalRequestService: symbol,
    DatabaseService: symbol,
    ValidationsService: symbol,
    ServerService: symbol,
    ServerValidations: symbol,
}






