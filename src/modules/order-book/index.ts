import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { OrderBookService } from "./order-book.service";
import { IOrderBookService } from "./interfaces";

export const orderBookModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IOrderBookService>(SYMBOLS.OrderBookService).to(OrderBookService);
});

export * from "./interfaces";