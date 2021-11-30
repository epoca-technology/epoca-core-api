import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../types";
import { TrendForecastService } from "./trend-forecast.service";
import { ITrendForecastService } from "./interfaces";

export const trendForecastModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ITrendForecastService>(SYMBOLS.TrendForecastService).to(TrendForecastService);
});

export * from './interfaces';