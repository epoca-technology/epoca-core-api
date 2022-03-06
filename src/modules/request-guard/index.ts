import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { RequestGuardService } from "./request-guard.service";
import { IRequestGuardService } from "./interfaces";

export const requestGuardModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IRequestGuardService>(SYMBOLS.RequestGuardService).to(RequestGuardService);
});

export * from './interfaces';
export * from './rate.limit';