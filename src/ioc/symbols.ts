/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {
    // Auth
    AuthService: Symbol.for("AuthService"),
    AuthModel: Symbol.for("AuthModel"),
    AuthValidations: Symbol.for("AuthValidations"),

    // Forecast
    ForecastService: Symbol.for("ForecastService"),

    // Candlestick
    CandlestickService: Symbol.for("CandlestickService"),
    CandlestickModel: Symbol.for("CandlestickModel"),
    CandlestickValidations: Symbol.for("CandlestickValidations"),

    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Utilities
    UtilitiesService: Symbol.for("UtilitiesService"),

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // Database
    DatabaseService: Symbol.for("DatabaseService"),
    DatabaseBackupService: Symbol.for("DatabaseBackupService"),
    DatabaseRestoreService: Symbol.for("DatabaseRestoreService"),
    DatabaseValidations: Symbol.for("DatabaseValidations"),

    // Notifications
    NotificationService: Symbol.for("NotificationService"),

    // Validations
    ValidationsService: Symbol.for("ValidationsService"),

    // Server
    ServerService: Symbol.for("ServerService"),
    ServerValidations: Symbol.for("ServerValidations"),

    // GUI Version
    GuiVersionService: Symbol.for("GuiVersionService"),

    // Request Guard
    RequestGuardService: Symbol.for("RequestGuardService"),
}


export interface ISymbols {
    AuthService: symbol,
    AuthModel: symbol,
    AuthValidations: symbol,
    ForecastService: symbol,
    CandlestickService: symbol,
    CandlestickModel: symbol,
    CandlestickValidations: symbol,
    BinanceService: symbol,
    UtilitiesService: symbol,
    ExternalRequestService: symbol,
    DatabaseService: symbol,
    DatabaseBackupService: symbol,
    DatabaseRestoreService: symbol,
    DatabaseValidations: symbol,
    NotificationService: symbol,
    ValidationsService: symbol,
    ServerService: symbol,
    ServerValidations: symbol,
    GuiVersionService: symbol,
    RequestGuardService: symbol,
}






