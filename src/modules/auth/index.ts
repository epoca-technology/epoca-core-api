import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { AuthService } from "./auth.service";
import { AuthModel } from "./auth.model";
import { AuthValidations } from "./auth.validations";
import { ApiSecretService } from "./api-secret.service";
import { IAuthService, IAuthModel, IAuthValidations, IApiSecretService } from "./interfaces";

export const authModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IAuthService>(SYMBOLS.AuthService).to(AuthService);
    bind<IAuthModel>(SYMBOLS.AuthModel).to(AuthModel);
    bind<IAuthValidations>(SYMBOLS.AuthValidations).to(AuthValidations);
    bind<IApiSecretService>(SYMBOLS.ApiSecretService).to(ApiSecretService);
});

export * from './interfaces';