import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { PredictionService } from "./prediction.service";
import { IPredictionService } from "./interfaces";

export const predictionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IPredictionService>(SYMBOLS.PredictionService).to(PredictionService);
});

export * from './interfaces';