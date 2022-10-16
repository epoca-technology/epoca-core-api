/**
 * API Symbols
 */

 export const SYMBOLS: ISymbols = {
    // API Error
    ApiErrorService: Symbol.for("ApiErrorService"),

    // Auth
    AuthService: Symbol.for("AuthService"),
    AuthModel: Symbol.for("AuthModel"),
    AuthValidations: Symbol.for("AuthValidations"),
    ApiSecretService: Symbol.for("ApiSecretService"),

    // Binance
    BinanceService: Symbol.for("BinanceService"),

    // Bulk Data
    BulkDataService: Symbol.for("BulkDataService"),

    // Candlestick
    CandlestickService: Symbol.for("CandlestickService"),
    CandlestickModel: Symbol.for("CandlestickModel"),
    CandlestickValidations: Symbol.for("CandlestickValidations"),
    CandlestickFileService: Symbol.for("CandlestickFileService"),

    // Database
    DatabaseService: Symbol.for("DatabaseService"),
    DatabaseFileService: Symbol.for("DatabaseFileService"),

    // Epoch
    EpochService: Symbol.for("EpochService"),
    EpochValidations: Symbol.for("EpochValidations"),
    EpochModel: Symbol.for("EpochModel"),
    EpochFile: Symbol.for("EpochFile"),

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // File Manager
    FileManagerService: Symbol.for("FileManagerService"),

    // Prediction
    PredictionService: Symbol.for("PredictionService"),
    PredictionValidations: Symbol.for("PredictionValidations"),
    PredictionModel: Symbol.for("PredictionModel"),

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
    ApiErrorService: symbol,


    AuthService: symbol,
    AuthModel: symbol,
    AuthValidations: symbol,
    ApiSecretService: symbol,


    BinanceService: symbol,


    BulkDataService: symbol,


    CandlestickService: symbol,
    CandlestickModel: symbol,
    CandlestickValidations: symbol,
    CandlestickFileService: symbol,


    DatabaseService: symbol,
    DatabaseFileService: symbol,


    EpochService: symbol,
    EpochValidations: symbol,
    EpochModel: symbol,
    EpochFile: symbol,
    

    ExternalRequestService: symbol,


    FileManagerService: symbol,


    PredictionService: symbol,
    PredictionValidations: symbol,
    PredictionModel: symbol,


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






