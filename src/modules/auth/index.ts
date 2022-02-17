import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { AuthService } from "./auth.service";
import { AuthModel } from "./auth.model";
import { AuthValidations } from "./auth.validations";
import { IAuthService, IAuthModel, IAuthValidations } from "./interfaces";

export const authModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IAuthService>(SYMBOLS.AuthService).to(AuthService);
    bind<IAuthModel>(SYMBOLS.AuthModel).to(AuthModel);
    bind<IAuthValidations>(SYMBOLS.AuthValidations).to(AuthValidations);
});

export * from './interfaces';