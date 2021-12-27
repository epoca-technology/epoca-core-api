import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ForecastService } from "./forecast.service";
import { IForecastService, IKeyZonesService } from "./interfaces";
import { KeyZonesService } from "./key-zones.service";

export const forecastModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IForecastService>(SYMBOLS.ForecastService).to(ForecastService);
    bind<IKeyZonesService>(SYMBOLS.KeyZonesService).to(KeyZonesService);
});

export * from './interfaces';