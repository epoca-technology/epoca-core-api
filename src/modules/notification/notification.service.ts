import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { Telegraf} from "telegraf";
import { getMessaging, Messaging, MulticastMessage } from "firebase-admin/messaging"
import { IUtilitiesService } from "../utilities";
import { IAuthService } from "../auth";
import { IApiErrorService } from "../api-error";
import { IReversalKind, IStateType } from "../market-state";
import { IPositionRecord } from "../position";
import { IBinanceMarginType } from "../binance";
import { INotificationService, INotification, INotificationChannel } from "./interfaces";




@injectable()
export class NotificationService implements INotificationService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.AuthService)                        private _auth: IAuthService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;

    // Priority Channel
    private readonly priorityChannel: INotificationChannel = "telegram";

    // Telegraf
    private readonly token: string = environment.telegraf.token;
    private readonly chatID: number = environment.telegraf.chatID;
    private readonly telegraf: Telegraf = new Telegraf(this.token);

    // Firebase Messaging
    private readonly messaging: Messaging = getMessaging();
    private readonly iconURL: string = "https://firebasestorage.googleapis.com/v0/b/projectplutus-prod.appspot.com/o/public%2Ffcm.png?alt=media&token=2fd0d0e1-ee6d-4f4f-b04d-891a4fa82bac";

    // Broadcast Queue
    private queue: INotification[] = [];
    private readonly queueLimit: number = 5;
    private readonly frequencySeconds: number = 10;
    private broadcastInterval: any;



    constructor() {}










    /**************
     * Initiaizer *
     **************/






    /**
     * Initializes the interval that will broadcast notifications
     * from the queue. Once broadcasted, the queue is moved and
     * prepares itself to broadcast the next notification.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        this.broadcastInterval = setInterval(async () => {
            if (this.queue.length) {
                await this._broadcast(this.queue[0]);
                this.queue = this.queue.slice(1, this.queueLimit + 1);
            }
        }, this.frequencySeconds * 1000);
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.broadcastInterval) clearInterval(this.broadcastInterval);
        this.broadcastInterval = undefined;
    }



















    /***************
     * Broadcaster *
     ***************/









    /**
     * Broadcasts a Notification in a persistant way. If the primary
     * communication channel fails (Telegram), will attempt to send
     * push notifications (FCM).
     * This function is safe. Even if none of the services work, the 
     * promise resolves.
     * @param notification 
     */
    public async broadcast(notification: INotification): Promise<void> {
        if (this.queue.length < this.queueLimit) { this.queue.push(notification) }
    }
    public async _broadcast(notification: INotification): Promise<void> {
        // Attempt to send the notification through the priority channel
        try { 
            if (this.priorityChannel == "telegram") { await this.sendTelegram(notification) }
            else { await this.sendPushNotification(notification) }
        } catch (e) {
            // Log the error
            console.error("The Notification could not be sent through Telegram:", e);
            this._apiError.log("NotificationService.broadcast", e, undefined, undefined, notification);

            // Attempt to send the notification through the secondary channel
            try { 
                if (this.priorityChannel == "telegram") { await this.sendPushNotification(notification) }
                else { await this.sendTelegram(notification) }
            } catch (e) {
                // Log the error
                console.error("The Notification could not be sent through FCM:", e);
                this._apiError.log("NotificationService.broadcast", e, undefined, undefined, notification);
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
            console.error("Error during sendTelegram. Attemting again in a few seconds", e);
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
                    title: `EPOCA_${notification.sender}: ${notification.title}`,
                    body: notification.description,
                    imageUrl: this.iconURL
                },
                tokens: fcmTokens
            };

            // Send it
            try { await this.messaging.sendMulticast(message) } 
            catch (e) {
                console.error("Error during sendPushNotification. Attemting again in a few seconds", e);
                await this._utils.asyncDelay(3);
                await this.messaging.sendMulticast(message);
            }
        }
    }




















    /*****************************************************************************
     * NOTIFICATION FACTORY                                                      *
     * Other modules can call these functions directly in order to simplify the  *
     * communication process.                                                    *
     *****************************************************************************/














    /*********************************
     * API Initializer Notifications *
     *********************************/




    /**
     * Triggers whenever the API cannot be initialized for
     * whatever reason.
     * @param error 
     * @returns Promise<void>
     */
    public apiInit(): Promise<void> {
        return this._broadcast({
            sender: "INITIALIZER",
            title: "Core API Initialized:",
            description: `The Core API has been initialized successfully and is ready to accept requests.`
        });
    }





    /**
     * Triggers whenever the API cannot be initialized for
     * whatever reason.
     * @param error 
     * @returns Promise<void>
     */
    public apiInitError(error: any): Promise<void> {
        return this._broadcast({
            sender: "INITIALIZER",
            title: "The API could not be initialized:",
            description: this._utils.getErrorMessage(error)
        });
    }







    








    /*****************************
     * Candlestick Notifications *
     *****************************/







    /**
     * Candlestick Sync Issue
     * @param error 
     * @returns Promise<void>
     */
    public candlestickSyncIssue(error: any): Promise<void> {
        return this.broadcast({
            sender: "CANDLESTICK",
            title: "Error during candlesticks sync:",
            description: this._utils.getErrorMessage(error)
        });
    }















    /************************
     * Server Notifications *
     ************************/




    /**
     * High File System Usage
     * @returns Promise<void>
     */
    public highFileSystemUsage(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High File System Usage!",
            description: "The server has detected that the File System Usage exceeded the values established in the alarms configuration."
        });
    }


    /**
     * High Memory Usage
     * @returns Promise<void>
     */
    public highMemoryUsage(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High Memory Usage!",
            description: "The server has detected that the Memory Usage exceeded the values established in the alarms configuration."
        });
    }



    /**
     * High CPU Load
     * @returns Promise<void>
     */
     public highCPULoad(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High CPU Load!",
            description: "The server has detected that the CPU Load exceeded the values established in the alarms configuration."
        });
    }




    /**
     * High CPU Temperature
     * @returns Promise<void>
     */
     public highCPUTemperature(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High CPU Temperature!",
            description: "The server has detected that the CPU Temperature exceeded the values established in the alarms configuration."
        });
    }




    /**
     * High GPU Load
     * @returns Promise<void>
     */
     public highGPULoad(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High GPU Load!",
            description: "The server has detected that the GPU Load exceeded the values established in the alarms configuration."
        });
    }



    /**
     * High GPU Temperature
     * @returns Promise<void>
     */
     public highGPUTemperature(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High GPU Temperature!",
            description: "The server has detected that the GPU Temperature exceeded the values established in the alarms configuration."
        });
    }



    /**
     * High GPU Memory Temperature
     * @returns Promise<void>
     */
     public highGPUMemoryTemperature(): Promise<void> {
        return this.broadcast({
            sender: "SERVER",
            title: "High GPU Memory Temperature!",
            description: "The server has detected that the GPU Memory Temperature exceeded the values established in the alarms configuration."
        });
    }

























    
    /******************************
     * Market State Notifications *
     ******************************/






    /**
     * Increasing or Decreasing Window State.
     * @param state 
     * @param change 
     * @param price 
     * @returns Promise<void>
     */
     public windowState(state: IStateType, change: number, price: number): Promise<void> {
        const stateName = state > 0 ? "increasing": "decreasing";
        return this.broadcast({
            sender: "MARKET_STATE",
            title: `Bitcoin is ${stateName}:`,
            description: `The price has changed ${change > 0 ? '+': ''}${change}% in the current window and is currently at $${price}`
        });
    }










    /***************************
     * Liquidity Notifications *
     ***************************/





    /**
     * Triggers when the websocket broadcasts an error.
     * @param error
     * @returns Promise<void>
     */
    public liquidityWebsocketError(error: any): Promise<void> {
        return this.broadcast({
            sender: "LIQUIDITY",
            title: `Websocket Error:`,
            description: this._utils.getErrorMessage(error)
        });
    }





    /**
     * Triggers when the websocket has not broadcasted data in an irregular period of time.
     * @returns Promise<void>
     */
    public liquidityWebsocketConnectionIssue(): Promise<void> {
        return this.broadcast({
            sender: "LIQUIDITY",
            title: `Websocket Connection:`,
            description: "The websocket has not broadcasted data in an irregular period of time. The system will attempt to restore the connection in a few seconds."
        });
    }














    /**********************
     * Coin Notifications *
     **********************/







    /**
     * Triggers when an installed coin is no longer supported by Binance.
     * @param symbol
     * @returns Promise<void>
     */
    public coinNoLongerSupported(symbol: string): Promise<void> {
        return this.broadcast({
            sender: "COIN",
            title: `${symbol} Warning:`,
            description: `The coin ${symbol} is no longer supported by Binance and should be uninstalled as soon as possible.`
        });
    }






    /**
     * Triggers when an installed coin no longer has an acceptable score.
     * @param symbol
     * @returns Promise<void>
     */
    public installedLowScoreCoin(symbol: string): Promise<void> {
        return this.broadcast({
            sender: "COIN",
            title: `${symbol} Warning:`,
            description: `The score of ${symbol} no longer meets the standards set by Epoca and should be uninstalled as soon as possible.`
        });
    }





    /**
     * Triggers when an installed coin is crashing strongly.
     * @param symbol
     * @param priceChangePercent
     * @returns Promise<void>
     */
    public installedCoinIsCrashing(symbol: string, priceChangePercent: number): Promise<void> {
        return this.broadcast({
            sender: "COIN",
            title: `${symbol} Warning:`,
            description: `The coin ${symbol} has decreased ${priceChangePercent}% in the past 24 hours. Please consider uninstalling this coin as soon as possible.`
        });
    }






    /**
     * Triggers when the websocket broadcasts an error.
     * @param error
     * @returns Promise<void>
     */
    public coinWebsocketError(error: any): Promise<void> {
        return this.broadcast({
            sender: "COIN",
            title: `Websocket Error:`,
            description: this._utils.getErrorMessage(error)
        });
    }





    /**
     * Triggers when the websocket has not broadcasted data in an irregular period of time.
     * @returns Promise<void>
     */
    public coinWebsocketConnectionIssue(): Promise<void> {
        return this.broadcast({
            sender: "COIN",
            title: `Websocket Connection:`,
            description: "The websocket has not broadcasted data in an irregular period of time. The system will attempt to restore the connection in a few seconds."
        });
    }




    









    /**************************
     * Reversal Notifications *
     **************************/







    /**
     * Triggers when a Reversal Event is issued by the Market State Module.
     * @param reversalKind
     * @param score
     * @returns Promise<void>
     */
    public onReversalEvent(reversalKind: IReversalKind, score: number): Promise<void> {
        return this.broadcast({
            sender: "REVERSAL",
            title: `${reversalKind == 1 ? 'Support': 'Resistance'} Reversal Event`,
            description: `The Reversal Module has issued a ${reversalKind == 1 ? 'Support': 'Resistance'} Reversal Event with an accumulated score of ${score} points.`
        });
    }



















    /**************************
     * Position Notifications *
     **************************/








    /**
     * Notifies the users that the onReversalStateEvent has triggered
     * an error.
     * @param error 
     * @returns Promise<void>
     */
    public onReversalStateEventError(error: any): Promise<void> {
        return this.broadcast({
            sender: "POSITION",
            title: "PositionService.onReversalStateEvent:",
            description: this._utils.getErrorMessage(error)
        });
    }





    /**
     * Notifies the users that the position refresh function has thrown
     * an unknown error.
     * @param msg 
     * @returns Promise<void>
     */
    public onRefreshActivePositionsError(msg: string): Promise<void> {
        return this.broadcast({
            sender: "POSITION",
            title: "PositionService.refreshActivePositions:",
            description: msg
        });
    }








    /**
     * This function is invoked whenever a position is opened.
     * @param pos 
     * @returns Promise<void>
     */
    public positionHasBeenOpened(pos: IPositionRecord): Promise<void> {
        let desc: string = `The ${pos.side} position has been opened `;
        desc += `at ${this._utils.formatNumber(pos.entry_price, pos.coin.pricePrecision)}$ `;
        desc += `with a margin of $${this._utils.formatNumber(pos.isolated_wallet)}, totaling `;
        desc += `${this._utils.formatNumber(pos.position_amount, pos.coin.quantityPrecision)} ${pos.coin.symbol}.`;
        return this.broadcast({
            sender: "POSITION",
            title: `${pos.coin.symbol} ${pos.side} Opened:`,
            description: desc
        });
    }






    /**
     * This function is invoked whenever a position is opened with an 
     * invalid leverage
     * @param pos 
     * @param correctLeverage 
     * @returns Promise<void>
     */
    public positionHasBeenOpenedWithInvalidLeverage(pos: IPositionRecord, correctLeverage: number): Promise<void> {
        let desc: string = `Warning! The ${pos.coin.symbol} position has been opened `;
        desc += `with a levereage of x${pos.leverage}, different to the one set on the `;
        desc += `Trading Strategy (x${correctLeverage}). Please close this position `;
        desc += `as soon as possible to avoid loss of funds as the behaviour of this `;
        desc += `missconfiguration may be unexpected.`;
        return this.broadcast({
            sender: "POSITION",
            title: `${pos.coin.symbol} INVALID LEVERAGE:`,
            description: desc
        });
    }








    /**
     * This function is invoked whenever a position is opened with an 
     * invalid margin type
     * @param pos 
     * @param correctMarginType 
     * @returns Promise<void>
     */
    public positionHasBeenOpenedWithInvalidMarginType(pos: IPositionRecord, correctMarginType: IBinanceMarginType): Promise<void> {
        let desc: string = `Warning! The ${pos.coin.symbol} position has been opened `;
        desc += `with the margin type set to ${pos.margin_type}, different to the one supported `;
        desc += `by Epoca (${correctMarginType}). Please close this position `;
        desc += `as soon as possible to avoid loss of funds as the behaviour of this `;
        desc += `missconfiguration may be unexpected.`;
        return this.broadcast({
            sender: "POSITION",
            title: `${pos.coin.symbol} INVALID MARGIN TYPE:`,
            description: desc
        });
    }






    /**
     * This function is invoked whenever a position is closed.
     * @param pos 
     * @returns Promise<void>
     */
    public positionHasBeenClosed(pos: IPositionRecord): Promise<void> {
        let desc: string = `The ${pos.side} position has been closed `;
        desc += `at ${this._utils.formatNumber(pos.mark_price, pos.coin.pricePrecision)}$ `;
        desc += `with a gain of ${pos.gain > 0 ? '+': ''}${pos.gain}% and a `;
        desc += `PNL of ${pos.unrealized_pnl > 0 ? '+': ''}${this._utils.formatNumber(pos.unrealized_pnl)}$.`;
        return this.broadcast({
            sender: "POSITION",
            title: `${pos.coin.symbol} ${pos.side} Closed:`,
            description: desc
        });
    }

}