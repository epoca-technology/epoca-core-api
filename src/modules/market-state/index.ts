import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { MarketStateService } from "./market-state.service";
import { WindowStateService } from "./window-state.service";
import { NetworkFeeStateService } from "./network-fee-state.service";
import { VolumeStateService } from "./volume-state.service";
import { OpenInterestStateService } from "./open-interest-state.service";
import { OpenInterestByBitStateService } from "./open-interest-bybit-state.service";
import { OpenInterestOKXStateService } from "./open-interest-okx-state.service";
import { OpenInterestHuobiStateService } from "./open-interest-huobi-state.service";
import { LongShortRatioStateService } from "./long-short-ratio-state.service";
import { LongShortRatioTTAStateService } from "./long-short-ratio-tta-state.service";
import { LongShortRatioTTPStateService } from "./long-short-ratio-ttp-state.service";
import { TechnicalAnalysisStateService } from "./technical-analysis-state.service";
import { StateUtilitiesService } from "./state-utilities.service";
import { 
    IMarketStateService, 
    IWindowStateService, 
    INetworkFeeStateService,
    IVolumeStateService,
    IOpenInterestStateService,
    IOpenInterestByBitStateService,
    IOpenInterestOKXStateService,
    IOpenInterestHuobiStateService,
    ILongShortRatioStateService,
    ILongShortRatioTTAStateService,
    ILongShortRatioTTPStateService,
    ITechnicalAnalysisStateService,
    IStateUtilitiesService
} from "./interfaces";

export const marketStateModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IMarketStateService>(SYMBOLS.MarketStateService).to(MarketStateService);
    bind<IWindowStateService>(SYMBOLS.WindowStateService).to(WindowStateService);
    bind<INetworkFeeStateService>(SYMBOLS.NetworkFeeStateService).to(NetworkFeeStateService);
    bind<IVolumeStateService>(SYMBOLS.VolumeStateService).to(VolumeStateService);
    bind<IOpenInterestStateService>(SYMBOLS.OpenInterestStateService).to(OpenInterestStateService);
    bind<IOpenInterestByBitStateService>(SYMBOLS.OpenInterestByBitStateService).to(OpenInterestByBitStateService);
    bind<IOpenInterestOKXStateService>(SYMBOLS.OpenInterestOKXStateService).to(OpenInterestOKXStateService);
    bind<IOpenInterestHuobiStateService>(SYMBOLS.OpenInterestHuobiStateService).to(OpenInterestHuobiStateService);
    bind<ILongShortRatioStateService>(SYMBOLS.LongShortRatioStateService).to(LongShortRatioStateService);
    bind<ILongShortRatioTTAStateService>(SYMBOLS.LongShortRatioTTAStateService).to(LongShortRatioTTAStateService);
    bind<ILongShortRatioTTPStateService>(SYMBOLS.LongShortRatioTTPStateService).to(LongShortRatioTTPStateService);
    bind<ITechnicalAnalysisStateService>(SYMBOLS.TechnicalAnalysisStateService).to(TechnicalAnalysisStateService);
    bind<IStateUtilitiesService>(SYMBOLS.StateUtilitiesService).to(StateUtilitiesService);
});

export * from './interfaces';