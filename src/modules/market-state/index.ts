import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { MarketStateService } from "./market-state.service";
import { WindowStateService } from "./window-state.service";
import { NetworkFeeStateService } from "./network-fee-state.service";
import { VolumeStateService } from "./volume-state.service";
import { OpenInterestStateService } from "./open-interest-state.service";
import { LongShortRatioStateService } from "./long-short-ratio-state.service";
import { TechnicalAnalysisStateService } from "./technical-analysis-state.service";
import { StateUtilitiesService } from "./state-utilities.service";
import { 
    IMarketStateService, 
    IWindowStateService, 
    INetworkFeeStateService,
    IVolumeStateService,
    IOpenInterestStateService,
    ILongShortRatioStateService,
    ITechnicalAnalysisStateService,
    IStateUtilitiesService
} from "./interfaces";

export const marketStateModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IMarketStateService>(SYMBOLS.MarketStateService).to(MarketStateService);
    bind<IWindowStateService>(SYMBOLS.WindowStateService).to(WindowStateService);
    bind<INetworkFeeStateService>(SYMBOLS.NetworkFeeStateService).to(NetworkFeeStateService);
    bind<IVolumeStateService>(SYMBOLS.VolumeStateService).to(VolumeStateService);
    bind<IOpenInterestStateService>(SYMBOLS.OpenInterestStateService).to(OpenInterestStateService);
    bind<ILongShortRatioStateService>(SYMBOLS.LongShortRatioStateService).to(LongShortRatioStateService);
    bind<ITechnicalAnalysisStateService>(SYMBOLS.TechnicalAnalysisStateService).to(TechnicalAnalysisStateService);
    bind<IStateUtilitiesService>(SYMBOLS.StateUtilitiesService).to(StateUtilitiesService);
});

export * from './interfaces';