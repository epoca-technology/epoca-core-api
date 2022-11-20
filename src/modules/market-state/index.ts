import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { MarketStateService } from "./market-state.service";
import { WindowStateService } from "./window-state.service";
import { KeyZonesStateService } from "./keyzones-state.service";
import { NetworkFeeStateService } from "./network-fee-state.service";
import { VolumeStateService } from "./volume-state.service";
import { StateUtilitiesService } from "./state-utilities.service";
import { 
    IMarketStateService, 
    IWindowStateService, 
    IKeyZonesStateService,
    INetworkFeeStateService,
    IVolumeStateService,
    IStateUtilitiesService
} from "./interfaces";

export const marketStateModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IMarketStateService>(SYMBOLS.MarketStateService).to(MarketStateService);
    bind<IWindowStateService>(SYMBOLS.WindowStateService).to(WindowStateService);
    bind<IKeyZonesStateService>(SYMBOLS.KeyZonesStateService).to(KeyZonesStateService);
    bind<INetworkFeeStateService>(SYMBOLS.NetworkFeeStateService).to(NetworkFeeStateService);
    bind<IVolumeStateService>(SYMBOLS.VolumeStateService).to(VolumeStateService);
    bind<IStateUtilitiesService>(SYMBOLS.StateUtilitiesService).to(StateUtilitiesService);
});

export * from './interfaces';