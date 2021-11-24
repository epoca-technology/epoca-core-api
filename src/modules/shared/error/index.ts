import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../symbols";
import { ErrorService } from "./error.service";
import { IErrorService } from "./interfaces";

export const errorModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IErrorService>(SYMBOLS.ErrorService).to(ErrorService);
});

export * from './interfaces';