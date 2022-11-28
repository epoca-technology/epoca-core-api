import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { PositionService } from "./position.service";
import { PositionValidations } from "./position.validations";
import { PositionModel } from "./position.model";
import { PositionNotifications } from "./position.notifications";
import { 
    IPositionService, 
    IPositionValidations, 
    IPositionModel,
    IPositionNotifications
} from "./interfaces";

export const positionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IPositionService>(SYMBOLS.PositionService).to(PositionService);
    bind<IPositionValidations>(SYMBOLS.PositionValidations).to(PositionValidations);
    bind<IPositionModel>(SYMBOLS.PositionModel).to(PositionModel);
    bind<IPositionNotifications>(SYMBOLS.PositionNotifications).to(PositionNotifications);
});

export * from './interfaces';