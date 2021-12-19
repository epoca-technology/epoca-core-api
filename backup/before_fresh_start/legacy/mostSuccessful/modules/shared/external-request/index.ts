import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../../types";
import { ExternalRequestService } from "./external-request.service";
import { IExternalRequestService } from "./interfaces";

export const externalRequestModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IExternalRequestService>(SYMBOLS.ExternalRequest).to(ExternalRequestService);
});

export * from './interfaces';