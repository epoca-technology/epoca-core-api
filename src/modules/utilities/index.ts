import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { UtilitiesService } from "./utilities.service";
import { ValidationsService } from "./validations.service";
import { IUtilitiesService, IValidationsService } from "./interfaces";

export const utilitiesModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IUtilitiesService>(SYMBOLS.UtilitiesService).to(UtilitiesService);
    bind<IValidationsService>(SYMBOLS.ValidationsService).to(ValidationsService);
});

export * from './interfaces';