import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { CandlestickService } from "./candlestick.service";
import { ICandlestickService } from "./interfaces";

export const candlestickModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ICandlestickService>(SYMBOLS.CandlestickService).to(CandlestickService);
});

export * from './interfaces';