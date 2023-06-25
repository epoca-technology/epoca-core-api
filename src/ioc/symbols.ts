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

    // External Request
    ExternalRequestService: Symbol.for("ExternalRequestService"),

    // File Manager
    FileManagerService: Symbol.for("FileManagerService"),

    // GUI Version
    GuiVersionService: Symbol.for("GuiVersionService"),

    // IP Blacklist
    IPBlacklistService: Symbol.for("IPBlacklistService"),
    IPBlacklistModel: Symbol.for("IPBlacklistModel"),
    IPBlacklistValidations: Symbol.for("IPBlacklistValidations"),

    // Market State
    MarketStateService: Symbol.for("MarketStateService"),
    WindowStateService: Symbol.for("WindowStateService"),
    VolumeStateService: Symbol.for("VolumeStateService"),
    KeyZonesStateService: Symbol.for("KeyZonesStateService"),
    LiquidityService: Symbol.for("LiquidityService"),
    CoinsService: Symbol.for("CoinsService"),
    ReversalService: Symbol.for("ReversalService"),
    StateUtilitiesService: Symbol.for("StateUtilitiesService"),

    // Notifications
    NotificationService: Symbol.for("NotificationService"),

    // Position
    PositionService: Symbol.for("PositionService"),
    PositionUtilities: Symbol.for("PositionUtilities"),
    PositionValidations: Symbol.for("PositionValidations"),
    PositionModel: Symbol.for("PositionModel"),

    // Request Guard
    RequestGuardService: Symbol.for("RequestGuardService"),

    // Server
    ServerService: Symbol.for("ServerService"),
    ServerValidations: Symbol.for("ServerValidations"),

    // Transaction
    TransactionService: Symbol.for("TransactionService"),
    TransactionValidations: Symbol.for("TransactionValidations"),
    TransactionModel: Symbol.for("TransactionModel"),

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
    

    ExternalRequestService: symbol,


    FileManagerService: symbol,


    GuiVersionService: symbol,


    IPBlacklistService: symbol,
    IPBlacklistModel: symbol,
    IPBlacklistValidations: symbol,


    MarketStateService: symbol,
    WindowStateService: symbol,
    VolumeStateService: symbol,
    KeyZonesStateService: symbol,
    LiquidityService: symbol,
    CoinsService: symbol,
    ReversalService: symbol,
    StateUtilitiesService: symbol,


    NotificationService: symbol,


    PositionService: symbol,
    PositionUtilities: symbol,
    PositionValidations: symbol,
    PositionModel: symbol,


    RequestGuardService: symbol,


    ServerService: symbol,
    ServerValidations: symbol,


    TransactionService: symbol,
    TransactionValidations: symbol,
    TransactionModel: symbol,


    UtilitiesService: symbol,
    ValidationsService: symbol,
}






