import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { EpochService } from "./epoch.service";
import { EpochValidations } from "./epoch.validations";
import { EpochModel } from "./epoch.model";
import { EpochFile } from "./epoch.file";
import { IEpochService, IEpochValidations, IEpochModel, IEpochFile } from "./interfaces";

export const epochModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IEpochService>(SYMBOLS.EpochService).to(EpochService);
    bind<IEpochValidations>(SYMBOLS.EpochValidations).to(EpochValidations);
    bind<IEpochModel>(SYMBOLS.EpochModel).to(EpochModel);
    bind<IEpochFile>(SYMBOLS.EpochFile).to(EpochFile);
});

export * from './interfaces';