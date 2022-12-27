import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { SignalService } from "./signal.service";
import { ISignalService } from "./interfaces";

export const signalModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ISignalService>(SYMBOLS.SignalService).to(SignalService);
});

export * from './interfaces';