import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../symbols";
import { ArimaService } from "./arima.service";
import { IArimaService } from "./interfaces";

export const arimaModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IArimaService>(SYMBOLS.ArimaService).to(ArimaService);
});

export * from './interfaces';