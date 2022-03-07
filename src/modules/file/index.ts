import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { FileService } from "./file.service";
import { IFileService } from "./interfaces";

export const fileModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IFileService>(SYMBOLS.FileService).to(FileService);
});

export * from './interfaces';