import {ContainerModule, interfaces} from "inversify";
import { SYMBOLS } from "../../ioc";
import { 
    IStateUtilities, StateUtilities,

    IWindowValidations, WindowValidations,
    IWindowModel, WindowModel,
    IWindowService, WindowService,

    IVolumeValidations, VolumeValidations,
    IVolumeModel, VolumeModel,
    IVolumeService, VolumeService,

    ILiquidityValidations, LiquidityValidations,
    ILiquidityModel, LiquidityModel,
    ILiquidityService, LiquidityService,

    IKeyZonesValidations, KeyZonesValidations,
    IKeyZonesModel, KeyZonesModel,
    IKeyZonesService, KeyZonesService,

    ICoinsValidations, CoinsValidations,
    ICoinsModel, CoinsModel,
    ICoinsService, CoinsService,

    IReversalValidations, ReversalValidations,
    IReversalModel, ReversalModel,
    IReversalService, ReversalService
} from "./submodules";
import { MarketStateService } from "./market-state.service";
import { IMarketStateService } from "./interfaces";


// Export the module
export const marketStateModule: ContainerModule = new ContainerModule(
    (bind: interfaces.Bind, unbind: interfaces.Unbind) => {
        // State Utilities
        bind<IStateUtilities>(SYMBOLS.StateUtilities).to(StateUtilities);

        // Window
        bind<IWindowValidations>(SYMBOLS.WindowValidations).to(WindowValidations);
        bind<IWindowModel>(SYMBOLS.WindowModel).to(WindowModel);
        bind<IWindowService>(SYMBOLS.WindowService).to(WindowService);

        // Volume
        bind<IVolumeValidations>(SYMBOLS.VolumeValidations).to(VolumeValidations);
        bind<IVolumeModel>(SYMBOLS.VolumeModel).to(VolumeModel);
        bind<IVolumeService>(SYMBOLS.VolumeService).to(VolumeService);

        // Liquidity
        bind<ILiquidityValidations>(SYMBOLS.LiquidityValidations).to(LiquidityValidations);
        bind<ILiquidityModel>(SYMBOLS.LiquidityModel).to(LiquidityModel);
        bind<ILiquidityService>(SYMBOLS.LiquidityService).to(LiquidityService);

        // KeyZones
        bind<IKeyZonesValidations>(SYMBOLS.KeyZonesValidations).to(KeyZonesValidations);
        bind<IKeyZonesModel>(SYMBOLS.KeyZonesModel).to(KeyZonesModel);
        bind<IKeyZonesService>(SYMBOLS.KeyZonesService).to(KeyZonesService);

        // Coins
        bind<ICoinsValidations>(SYMBOLS.CoinsValidations).to(CoinsValidations);
        bind<ICoinsModel>(SYMBOLS.CoinsModel).to(CoinsModel);
        bind<ICoinsService>(SYMBOLS.CoinsService).to(CoinsService);

        // Reversal
        bind<IReversalValidations>(SYMBOLS.ReversalValidations).to(ReversalValidations);
        bind<IReversalModel>(SYMBOLS.ReversalModel).to(ReversalModel);
        bind<IReversalService>(SYMBOLS.ReversalService).to(ReversalService);

        // Market State
        bind<IMarketStateService>(SYMBOLS.MarketStateService).to(MarketStateService);
    }
);

// Export the types
export * from "./interfaces";

// Export the submodules
export * from "./submodules";