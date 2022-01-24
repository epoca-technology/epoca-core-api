import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { NotificationService } from "./notification.service";
import { INotificationService } from "./interfaces";

export const notificationModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<INotificationService>(SYMBOLS.NotificationService).to(NotificationService);
});

export * from './interfaces';