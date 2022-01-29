

// Service
export interface INotificationService {
    // Main Broadcaster
    broadcast(notification: INotification): Promise<void>,


}




// Notification Object
export interface INotification {
    sender: ISender,
    title: string,
    description: string
}


// Senders
export type ISender = "UNIT_TEST"|"SERVER"|"DATABASE_BACKUP"|"DATABASE_RESTORE";