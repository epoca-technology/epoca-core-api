import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { Telegraf} from 'telegraf';
import { getMessaging, Messaging, MulticastMessage } from "firebase-admin/messaging"
import { IUtilitiesService } from "../utilities";
import { IAuthService } from "../auth";
import { IApiErrorService } from "../api-error";
import { INotificationService, INotification, INotificationChannel } from "./interfaces";




@injectable()
export class NotificationService implements INotificationService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.AuthService)                        private _auth: IAuthService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;

    // Priority Channel
    private readonly priorityChannel: INotificationChannel = 'telegram';

    // Telegraf
    private readonly token: string = environment.telegraf.token;
    private readonly chatID: number = environment.telegraf.chatID;
    private readonly telegraf: Telegraf = new Telegraf(this.token);

    // Firebase Messaging
    private readonly messaging: Messaging = getMessaging();
    private readonly iconURL: string = 'https://firebasestorage.googleapis.com/v0/b/projectplutus-prod.appspot.com/o/public%2Ffcm.png?alt=media&token=2fd0d0e1-ee6d-4f4f-b04d-891a4fa82bac';


    constructor() {}








    /* Main Broadcaster */









    /**
     * Broadcasts a Notification in a persistant way. If the primary
     * communication channel fails (Telegram), will attempt to send
     * push notifications (FCM).
     * This function is safe. Even if none of the services work, the 
     * promise resolves.
     * @param notification 
     */
    public async broadcast(notification: INotification): Promise<void> {
        // Attempt to send the notification through the priority channel
        try { 
            if (this.priorityChannel == 'telegram') { await this.sendTelegram(notification) }
            else { await this.sendPushNotification(notification) }
        } catch (e) {
            // Log the error
            console.error('The Notification could not be sent through Telegram:', e);
            this._apiError.log('NotificationService.broadcast', e, undefined, undefined, notification);

            // Attempt to send the notification through the secondary channel
            try { 
                if (this.priorityChannel == 'telegram') { await this.sendPushNotification(notification) }
                else { await this.sendTelegram(notification) }
            } catch (e) {
                // Log the error
                console.error('The Notification could not be sent through FCM:', e);
                this._apiError.log('NotificationService.broadcast', e, undefined, undefined, notification);
            }
        }
    }










    /**
     * Sends a Notification through Telegram and attempts again after a 
     * delay in case of failure. If the second attempt is not successful, 
     * it will throw an error.
     * @param notification 
     * @returns Promise<void>
     */
    private async sendTelegram(notification: INotification): Promise<void> {
        // Init the message
        const msg: string = `${notification.sender}\n${notification.title}\n${notification.description}`;

        // Send it
        try { await this.telegraf.telegram.sendMessage(this.chatID, msg) } 
        catch (e) {
            console.error('Error during sendTelegram. Attemting again in a few seconds', e);
            await this._utils.asyncDelay(3);
            await this.telegraf.telegram.sendMessage(this.chatID, msg);
        }
    }












    /**
     * Sends a Notification through FCM and attempts again after a 
     * delay in case of failure. If the second attempt is not successful, 
     * it will throw an error.
     * @param notification 
     * @returns Promise<void>
     */
    private async sendPushNotification(notification: INotification): Promise<void> {
        // Retrieve the tokens
        const fcmTokens: string[] = await this._auth.getFCMTokens();

        // Broadcast the notification if tokens are found
        if (fcmTokens.length) {
            // Init the Message
            const message: MulticastMessage = {
                notification: {
                    title: `PLUTUS_${notification.sender}: ${notification.title}`,
                    body: notification.description,
                    imageUrl: this.iconURL
                },
                tokens: fcmTokens
            };

            // Send it
            try { await this.messaging.sendMulticast(message) } 
            catch (e) {
                console.error('Error during sendPushNotification. Attemting again in a few seconds', e);
                await this._utils.asyncDelay(3);
                await this.messaging.sendMulticast(message);
            }
        }
    }
}