import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { CryptoCurrencyService } from "./cryptocurrency.service";
import { ICryptoCurrencyService } from "./interfaces";

export const cryptocurrencyModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ICryptoCurrencyService>(SYMBOLS.CryptoCurrencyService).to(CryptoCurrencyService);
});

export * from './interfaces';