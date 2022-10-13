import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { PredictionService } from "./prediction.service";
import { PredictionValidations } from "./prediction.validations";
import { PredictionModel } from "./prediction.model";
import { IPredictionService, IPredictionValidations, IPredictionModel } from "./interfaces";

export const predictionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IPredictionService>(SYMBOLS.PredictionService).to(PredictionService);
    bind<IPredictionValidations>(SYMBOLS.PredictionValidations).to(PredictionValidations);
    bind<IPredictionModel>(SYMBOLS.PredictionModel).to(PredictionModel);
});

export * from './interfaces';