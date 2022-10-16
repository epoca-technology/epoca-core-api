import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { BulkDataService } from "./bulk-data.service";
import { IBulkDataService } from "./interfaces";

export const bulkDataModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IBulkDataService>(SYMBOLS.BulkDataService).to(BulkDataService);
});

export * from './interfaces';