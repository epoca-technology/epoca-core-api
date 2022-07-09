import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { DatabaseService } from "./database.service";
import { DatabaseFileService } from "./database-file.service";
import { IDatabaseService, IDatabaseFileService } from "./interfaces";

export const databaseModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IDatabaseService>(SYMBOLS.DatabaseService).to(DatabaseService);
    bind<IDatabaseFileService>(SYMBOLS.DatabaseFileService).to(DatabaseFileService);
});

export * from './interfaces';