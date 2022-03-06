import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ServerService } from "./server.service";
import { ServerValidations } from "./server.validations";
import { IServerService, IServerValidations } from "./interfaces";

export const serverModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IServerService>(SYMBOLS.ServerService).to(ServerService);
    bind<IServerValidations>(SYMBOLS.ServerValidations).to(ServerValidations);
});

export * from './interfaces';