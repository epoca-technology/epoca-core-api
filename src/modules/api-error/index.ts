import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ApiErrorService } from "./api-error.service";
import { IApiErrorService } from "./interfaces";

export const apiErrorModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IApiErrorService>(SYMBOLS.ApiErrorService).to(ApiErrorService);
});

export * from './interfaces';