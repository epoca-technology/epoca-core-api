import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { GuiVersionService } from "./gui-version.service";
import { IGuiVersionService } from "./interfaces";

export const guiVersionModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IGuiVersionService>(SYMBOLS.GuiVersionService).to(GuiVersionService);
});

export * from './interfaces';