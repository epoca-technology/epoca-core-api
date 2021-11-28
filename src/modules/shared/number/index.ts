import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../symbols";
import { NumberService } from "./number.service";
import { INumberService } from "./interfaces";

export const numberModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<INumberService>(SYMBOLS.NumberService).to(NumberService);
});

export * from './interfaces';