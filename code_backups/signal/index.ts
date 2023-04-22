import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { SignalService } from "./signal.service";
import { SignalValidations } from "./signal.validations";
import { SignalModel } from "./signal.model";
import { 
    ISignalService, 
    ISignalValidations, 
    ISignalModel,
} from "./interfaces";

export const signalModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ISignalService>(SYMBOLS.SignalService).to(SignalService);
    bind<ISignalValidations>(SYMBOLS.SignalValidations).to(SignalValidations);
    bind<ISignalModel>(SYMBOLS.SignalModel).to(SignalModel);
});

export * from './interfaces';