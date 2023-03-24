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

    // Market State
    MarketStateService: Symbol.for("MarketStateService"),
    WindowStateService: Symbol.for("WindowStateService"),
    VolumeStateService: Symbol.for("VolumeStateService"),
    KeyZonesStateService: Symbol.for("KeyZonesStateService"),
    LiquidityService: Symbol.for("LiquidityService"),
    TrendStateService: Symbol.for("TrendStateService"),
    CoinsService: Symbol.for("CoinsService"),
    StateUtilitiesService: Symbol.for("StateUtilitiesService"),

    // Notifications
    NotificationService: Symbol.for("NotificationService"),

    // Position
    PositionService: Symbol.for("PositionService"),
    PositionValidations: Symbol.for("PositionValidations"),
    PositionModel: Symbol.for("PositionModel"),

    // Request Guard
    RequestGuardService: Symbol.for("RequestGuardService"),

    // Server
    ServerService: Symbol.for("ServerService"),
    ServerValidations: Symbol.for("ServerValidations"),

    // Signal
    SignalService: Symbol.for("SignalService"),
    SignalValidations: Symbol.for("SignalValidations"),
    SignalModel: Symbol.for("SignalModel"),

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


    MarketStateService: symbol,
    WindowStateService: symbol,
    VolumeStateService: symbol,
    KeyZonesStateService: symbol,
    LiquidityService: symbol,
    TrendStateService: symbol,
    CoinsService: symbol,
    StateUtilitiesService: symbol,


    NotificationService: symbol,


    PositionService: symbol,
    PositionValidations: symbol,
    PositionModel: symbol,


    RequestGuardService: symbol,


    ServerService: symbol,
    ServerValidations: symbol,
    
    SignalService: symbol,
    SignalValidations: symbol,
    SignalModel: symbol,

    UtilitiesService: symbol,
    ValidationsService: symbol,
}






