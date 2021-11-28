import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../types";
import { TrendService } from "./trend.service";
import { ITrendService } from "./interfaces";

export const trendModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ITrendService>(SYMBOLS.TrendService).to(TrendService);
});

export * from './interfaces';