import { BehaviorSubject } from "rxjs";
import { 
    ICoinsState, 
    IKeyZoneState, 
    IMinifiedLiquidityState, 
    IVolumeStateIntensity, 
    IWindowState ,
    IMinifiedReversalState
} from "./submodules";






/**
 * Market State Service
 * This service handles the wrapping of all the submodules into an unified output.
 */
export interface IMarketStateService {
    // Properties
    active: BehaviorSubject<IMarketState>,

    // Initializer
    initialize(): Promise<void>,
    stop(): void
}







/**
 * Market State Object
 * The market state object built whenever the candlesticks are synced.
 */
export interface IMarketState {
    window: IWindowState,
    volume: IVolumeStateIntensity,
    liquidity: IMinifiedLiquidityState,
    keyzones: IKeyZoneState,
    coins: ICoinsState,
    coinsBTC: ICoinsState,
    reversal: IMinifiedReversalState
}