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
}






