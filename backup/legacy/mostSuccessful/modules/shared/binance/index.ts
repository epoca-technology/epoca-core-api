import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../types";
import { BinanceService } from "./binance.service";
import { IBinanceService } from "./interfaces";

export const binanceModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IBinanceService>(SYMBOLS.BinanceService).to(BinanceService);
});

export * from './interfaces';