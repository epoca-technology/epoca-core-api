import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IPBlacklistService } from "./ip-blacklist.service";
import { IPBlacklistModel } from "./ip-blacklist.model";
import { IPBlacklistValidations } from "./ip-blacklist.validations";
import { IIPBlacklistService, IIPBlacklistModel,  IIPBlacklistValidations} from "./interfaces";

export const ipBlacklistModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IIPBlacklistService>(SYMBOLS.IPBlacklistService).to(IPBlacklistService);
    bind<IIPBlacklistModel>(SYMBOLS.IPBlacklistModel).to(IPBlacklistModel);
    bind<IIPBlacklistValidations>(SYMBOLS.IPBlacklistValidations).to(IPBlacklistValidations);
});

export * from './interfaces';