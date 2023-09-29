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
    StateUtilities: Symbol.for("StateUtilities"),

    WindowService: Symbol.for("WindowService"),
    WindowModel: Symbol.for("WindowModel"),
    WindowValidations: Symbol.for("WindowValidations"),

    VolumeService: Symbol.for("VolumeService"),
    VolumeModel: Symbol.for("VolumeModel"),
    VolumeValidations: Symbol.for("VolumeValidations"),

    LiquidityService: Symbol.for("LiquidityService"),
    LiquidityModel: Symbol.for("LiquidityModel"),
    LiquidityValidations: Symbol.for("LiquidityValidations"),

    KeyZonesService: Symbol.for("KeyZonesService"),
    KeyZonesModel: Symbol.for("KeyZonesModel"),
    KeyZonesValidations: Symbol.for("KeyZonesValidations"),

    CoinsService: Symbol.for("CoinsService"),
    CoinsModel: Symbol.for("CoinsModel"),
    CoinsValidations: Symbol.for("CoinsValidations"),

    ReversalService: Symbol.for("ReversalService"),
    ReversalModel: Symbol.for("ReversalModel"),
    ReversalValidations: Symbol.for("ReversalValidations"),

    MarketStateService: Symbol.for("MarketStateService"),


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


    StateUtilities: symbol,

    WindowService: symbol,
    WindowModel: symbol,
    WindowValidations: symbol,

    VolumeService: symbol,
    VolumeModel: symbol,
    VolumeValidations: symbol,

    LiquidityService: symbol,
    LiquidityModel: symbol,
    LiquidityValidations: symbol,

    KeyZonesService: symbol,
    KeyZonesModel: symbol,
    KeyZonesValidations: symbol,

    CoinsService: symbol,
    CoinsModel: symbol,
    CoinsValidations: symbol,

    ReversalService: symbol,
    ReversalModel: symbol,
    ReversalValidations: symbol,

    MarketStateService: symbol,


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






