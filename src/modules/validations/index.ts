import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ValidationsService } from "./validations.service";
import { IValidationsService } from "./interfaces";

export const validationsModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IValidationsService>(SYMBOLS.ValidationsService).to(ValidationsService);
});

export * from './interfaces';