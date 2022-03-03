/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {
    // Auth
    AuthService: Symbol.for("AuthService"),
    AuthModel: Symbol.for("AuthModel"),
    AuthValidations: Symbol.for("AuthValidations"),
    ApiSecretService: Symbol.for("ApiSecretService"),

    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Candlestick
    CandlestickService: Symbol.for("CandlestickService"),
    CandlestickModel: Symbol.for("CandlestickModel"),
    CandlestickValidations: Symbol.for("CandlestickValidations"),

    // Database
    DatabaseService: Symbol.for("DatabaseService"),
    DatabaseBackupService: Symbol.for("DatabaseBackupService"),
    DatabaseRestoreService: Symbol.for("DatabaseRestoreService"),
    DatabaseValidations: Symbol.for("DatabaseValidations"),

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // Forecast
    ForecastService: Symbol.for("ForecastService"),

    // GUI Version
    GuiVersionService: Symbol.for("GuiVersionService"),

    // IP Blacklist
    IPBlacklistService: Symbol.for("IPBlacklistService"),
    IPBlacklistModel: Symbol.for("IPBlacklistModel"),
    IPBlacklistValidations: Symbol.for("IPBlacklistValidations"),

    // Notifications
    NotificationService: Symbol.for("NotificationService"),

    // Request Guard
    RequestGuardService: Symbol.for("RequestGuardService"),

    // Server
    ServerService: Symbol.for("ServerService"),
    ServerValidations: Symbol.for("ServerValidations"),

    // Utilities
    UtilitiesService: Symbol.for("UtilitiesService"),
    ValidationsService: Symbol.for("ValidationsService"),
}


export interface ISymbols {
    AuthService: symbol,
    AuthModel: symbol,
    AuthValidations: symbol,
    ApiSecretService: symbol,

    BinanceService: symbol,

    CandlestickService: symbol,
    CandlestickModel: symbol,
    CandlestickValidations: symbol,

    DatabaseService: symbol,
    DatabaseBackupService: symbol,
    DatabaseRestoreService: symbol,
    DatabaseValidations: symbol,

    ExternalRequestService: symbol,

    ForecastService: symbol,

    GuiVersionService: symbol,

    IPBlacklistService: symbol,
    IPBlacklistModel: symbol,
    IPBlacklistValidations: symbol,

    NotificationService: symbol,

    RequestGuardService: symbol,

    ServerService: symbol,
    ServerValidations: symbol,
    
    UtilitiesService: symbol,
    ValidationsService: symbol,
}






