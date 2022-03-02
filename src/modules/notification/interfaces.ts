

// Service
export interface INotificationService {
    // Main Broadcaster
    broadcast(notification: INotification): Promise<void>,
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
export type INotificationSender = "UNIT_TEST"|"SERVER"|"DATABASE_BACKUP"|"DATABASE_RESTORE";