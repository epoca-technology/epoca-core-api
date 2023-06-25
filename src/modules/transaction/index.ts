import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { TransactionService } from "./transaction.service";
import { TransactionValidations } from "./transaction.validations";
import { TransactionModel } from "./transaction.model";
import { 
    ITransactionService, 
    ITransactionValidations, 
    ITransactionModel
} from "./interfaces";

export const transactionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<ITransactionService>(SYMBOLS.TransactionService).to(TransactionService);
    bind<ITransactionValidations>(SYMBOLS.TransactionValidations).to(TransactionValidations);
    bind<ITransactionModel>(SYMBOLS.TransactionModel).to(TransactionModel);
});

export * from './interfaces';