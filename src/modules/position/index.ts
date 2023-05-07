import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { PositionService } from "./position.service";
import { PositionUtilities } from "./position.utilities";
import { PositionValidations } from "./position.validations";
import { PositionModel } from "./position.model";
import { 
    IPositionService, 
    IPositionUtilities,
    IPositionValidations, 
    IPositionModel,
} from "./interfaces";

export const positionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IPositionService>(SYMBOLS.PositionService).to(PositionService);
    bind<IPositionUtilities>(SYMBOLS.PositionUtilities).to(PositionUtilities);
    bind<IPositionValidations>(SYMBOLS.PositionValidations).to(PositionValidations);
    bind<IPositionModel>(SYMBOLS.PositionModel).to(PositionModel);
});

export * from './interfaces';