import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { DatabaseService } from "./database.service";
import { DatabaseBackupService } from "./database.backup.service";
import { DatabaseRestoreService } from "./database.restore.service";
import { DatabaseValidations } from "./database.validations";
import { IDatabaseService, IDatabaseBackupService, IDatabaseRestoreService, IDatabaseValidations } from "./interfaces";

export const databaseModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IDatabaseService>(SYMBOLS.DatabaseService).to(DatabaseService);
    bind<IDatabaseBackupService>(SYMBOLS.DatabaseBackupService).to(DatabaseBackupService);
    bind<IDatabaseRestoreService>(SYMBOLS.DatabaseRestoreService).to(DatabaseRestoreService);
    bind<IDatabaseValidations>(SYMBOLS.DatabaseValidations).to(DatabaseValidations);
});

export * from './interfaces';