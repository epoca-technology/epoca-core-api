/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {
    // Forecast
    ForecastService: Symbol.for("ForecastService"),
    KeyZonesService: Symbol.for("KeyZonesService"),

    // Candlestick
    CandlestickService: Symbol.for("CandlestickService"),

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
    KeyZonesService: symbol,
    CandlestickService: symbol,
    BinanceService: symbol,
    UtilitiesService: symbol,
    ExternalRequestService: symbol,
    DatabaseService: symbol,
}






