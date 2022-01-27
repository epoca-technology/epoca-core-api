import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../../ioc";
import { IUtilitiesService } from "../utilities";
import { INotificationService, INotification } from "./interfaces";





@injectable()
export class NotificationService implements INotificationService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    constructor() {}








    public async broadcast(notification: INotification): Promise<void> {

    }








    private async sendTelegram(): Promise<void> {

    }






    private async sendPushNotification(): Promise<void> {

    }




}