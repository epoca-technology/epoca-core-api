import { IBinanceMarginType } from "../binance";
import { IReversalKind, IStateType } from "../market-state";
import { IPositionRecord } from "../position";


// Service
export interface INotificationService {
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Broadcaster
    broadcast(notification: INotification): Promise<void>, // Adds the notification to the queue
    _broadcast(notification: INotification): Promise<void>, // Sends the notification regardless of the queue

    /* NOTIFICATION FACTORY */

    // API Initializer Notifications
    apiInit(): Promise<void>,
    apiInitError(error: any): Promise<void>,

    // Candlesticks
    candlestickSyncIssue(error: any): Promise<void>,

    // Server
    highFileSystemUsage(): Promise<void>,
    highMemoryUsage(): Promise<void>,
    highCPULoad(): Promise<void>,
    highCPUTemperature(): Promise<void>,
    highGPULoad(): Promise<void>,
    highGPUTemperature(): Promise<void>,
    highGPUMemoryTemperature(): Promise<void>,

    // Market State Notifications
    windowState(state: IStateType, change: number, price: number): Promise<void>,

    // Liquidity Notifications
    liquidityWebsocketError(error: any): Promise<void>,
    liquidityWebsocketConnectionIssue(): Promise<void>,

    // Coin Notifications
    coinNoLongerSupported(symbol: string): Promise<void>,
    installedLowScoreCoin(symbol: string): Promise<void>,
    installedCoinIsCrashing(symbol: string, priceChangePercent: number): Promise<void>,
    coinWebsocketError(error: any): Promise<void>,
    coinWebsocketConnectionIssue(): Promise<void>,

    // Reversal Notifications
    onReversalEvent(reversalKind: IReversalKind, score: number): Promise<void>,

    // Position Notifications
    onReversalStateEventError(error: any): Promise<void>,
    onRefreshActivePositionsError(msg: string): Promise<void>,
    positionHasBeenOpened(pos: IPositionRecord): Promise<void>,
    positionHasBeenOpenedWithInvalidLeverage(
        pos: IPositionRecord, 
        correctLeverage: number
        ): Promise<void>,
    positionHasBeenOpenedWithInvalidMarginType(
        pos: IPositionRecord, 
        correctMarginType: IBinanceMarginType
    ): Promise<void>,
    positionHasBeenClosed(pos: IPositionRecord): Promise<void>
}


// Channels
export type INotificationChannel = 'telegram'|'fcm';


// Notification Object
export interface INotification {
    sender: INotificationSender,
    title: string,
    description: string
}


// Senders
export type INotificationSender = 
"UNIT_TEST"|
"INITIALIZER"|
"SERVER"|
"CANDLESTICK"|
"MARKET_STATE"|
"LIQUIDITY"|
"COIN"|
"REVERSAL"|


"POSITION"|
"CAMPAIGN";