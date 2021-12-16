import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../ioc";
import { UtilitiesService } from "./utilities.service";
import { IUtilitiesService } from "./interfaces";

export const utilitiesModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IUtilitiesService>(SYMBOLS.UtilitiesService).to(UtilitiesService);
});

export * from './interfaces';
export * from './rate.limit';