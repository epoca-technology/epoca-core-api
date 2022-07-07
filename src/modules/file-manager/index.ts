import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { FileManagerService } from "./file-manager.service";
import { IFileManagerService } from "./interfaces";

export const fileManagerModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IFileManagerService>(SYMBOLS.FileManagerService).to(FileManagerService);
});

export * from './interfaces';