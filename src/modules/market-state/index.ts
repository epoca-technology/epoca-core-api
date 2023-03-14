import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { MarketStateService } from "./market-state.service";
import { WindowStateService } from "./window-state.service";
import { VolumeStateService } from "./volume-state.service";
import { OpenInterestStateService } from "./open-interest-state.service";
import { LongShortRatioStateService } from "./long-short-ratio-state.service";
import { TechnicalAnalysisStateService } from "./technical-analysis-state.service";
import { LiquidityStateService } from "./liquidity-state.service";
import { KeyZonesStateService } from "./keyzones-state.service";
import { TrendStateService } from "./trend-state.service";
import { StateUtilitiesService } from "./state-utilities.service";
import { 
    IMarketStateService, 
    IWindowStateService, 
    IVolumeStateService,
    IOpenInterestStateService,
    ILongShortRatioStateService,
    ITechnicalAnalysisStateService,
    ILiquidityStateService,
    IKeyZonesStateService,
    IStateUtilitiesService,
    ITrendStateService
} from "./interfaces";

export const marketStateModule: ContainerModule = new ContainerModule((bind: interfaces.Bind, unbind: interfaces.Unbind) => {
    bind<IMarketStateService>(SYMBOLS.MarketStateService).to(MarketStateService);
    bind<IWindowStateService>(SYMBOLS.WindowStateService).to(WindowStateService);
    bind<IVolumeStateService>(SYMBOLS.VolumeStateService).to(VolumeStateService);
    bind<IOpenInterestStateService>(SYMBOLS.OpenInterestStateService).to(OpenInterestStateService);
    bind<ILongShortRatioStateService>(SYMBOLS.LongShortRatioStateService).to(LongShortRatioStateService);
    bind<ITechnicalAnalysisStateService>(SYMBOLS.TechnicalAnalysisStateService).to(TechnicalAnalysisStateService);
    bind<ILiquidityStateService>(SYMBOLS.LiquidityService).to(LiquidityStateService);
    bind<IKeyZonesStateService>(SYMBOLS.KeyZonesStateService).to(KeyZonesStateService);
    bind<ITrendStateService>(SYMBOLS.TrendStateService).to(TrendStateService);
    bind<IStateUtilitiesService>(SYMBOLS.StateUtilitiesService).to(StateUtilitiesService);
});

export * from './interfaces';