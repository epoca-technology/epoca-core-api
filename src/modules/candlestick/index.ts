import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { CandlestickService } from "./candlestick.service";
import { CandlestickModel } from "./candlestick.model";
import { CandlestickValidations } from "./candlestick.validations";
import { ICandlestickService, ICandlestickModel, ICandlestickValidations } from "./interfaces";

export const candlestickModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ICandlestickService>(SYMBOLS.CandlestickService).to(CandlestickService);
    bind<ICandlestickModel>(SYMBOLS.CandlestickModel).to(CandlestickModel);
    bind<ICandlestickValidations>(SYMBOLS.CandlestickValidations).to(CandlestickValidations);
});

export * from './interfaces';