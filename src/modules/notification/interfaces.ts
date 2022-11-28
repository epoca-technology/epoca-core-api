import { IStateType } from "../market-state";


// Service
export interface INotificationService {
    // Main Broadcaster
    broadcast(notification: INotification): Promise<void>,

    /* NOTIFICATION FACTORY */

    // API Initializer Notifications
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

    // Prediction Notifications
    predictionGenerationIssue(error: any): Promise<void>,
    
    // Order Book Notifications
    orderBookIssue(error: any): Promise<void>,

    // Market State Notifications
    windowState(state: IStateType, stateValue: number): Promise<void>,
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
"PREDICTION"|
"ORDER_BOOK"|
"MARKET_STATE";