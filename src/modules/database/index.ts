import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { DatabaseService } from "./database.service";
import { IDatabaseService } from "./interfaces";

export const databaseModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IDatabaseService>(SYMBOLS.DatabaseService).to(DatabaseService);
});

export * from './interfaces';