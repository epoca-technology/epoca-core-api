import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { INotificationService, INotification } from "./interfaces";
import { Telegraf} from 'telegraf';




@injectable()
export class NotificationService implements INotificationService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    // Telegraf
    private readonly token: string = environment.telegraf.token;
    private readonly chatID: number = environment.telegraf.chatID;
    private readonly telegraf: Telegraf = new Telegraf(this.token);




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
        // Attempt to send the notification through telegram
        try { await this.sendTelegram(notification) } 
        catch (e) {
            // Log the error
            // @TODO
            console.error('The Notification could not be sent through Telegram:', e);

            // Attempt to send the notification through FCM
            try { await this.sendPushNotification(notification) } 
            catch (e) {
                // Log the error
                // @TODO
                console.error('The Notification could not be sent through FCM:', e);
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
        try {
            await this.telegraf.telegram.sendMessage(this.chatID, msg);
        } catch (e) {
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

    }






    

}