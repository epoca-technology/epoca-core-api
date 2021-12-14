import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../types";
import { ForecastService } from "./forecast.service";
import { IForecastService } from "./interfaces";

export const forecastModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IForecastService>(SYMBOLS.ForecastService).to(ForecastService);
});

export * from './interfaces';