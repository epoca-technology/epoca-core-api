import {injectable, inject, postConstruct} from "inversify";
import { BehaviorSubject } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { 
    IMarketStateService,
    IMarketState,
    IWindowStateService,
    IVolumeStateService,
    IKeyZonesStateService,
    INetworkFeeStateService
} from "./interfaces";




@injectable()
export class MarketStateService implements IMarketStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.WindowStateService)                 private _windowState: IWindowStateService;
    @inject(SYMBOLS.VolumeStateService)                 private _volumeState: IVolumeStateService;
    @inject(SYMBOLS.KeyZonesStateService)               private _keyZoneState: IKeyZonesStateService;
    @inject(SYMBOLS.NetworkFeeStateService)             private _networkFeeState: INetworkFeeStateService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;


    /**
     * Window Size
     * The number of prediction candlesticks that comprise the window.
     */
    private readonly windowSize: number = 32;


    /**
     * Market State Interval
     * Every intervalSeconds, the market state will be calculated and broadcasted.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 30;


    /**
     * Active Market State
     * Whenever a new market state is calculated, it is broadcasted and stored in this
     * variable.
     */
    public active: BehaviorSubject<IMarketState>;



    constructor() {}



    @postConstruct()
    public onInit(): void {
        this.active = new BehaviorSubject(this.getDefaultState());
    }






    /***************
     * Initializer *
     ***************/




    /**
     * Initializes all the required submodules as well as the interval
     * that will take care of updating the state constantly.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the network fee module
        await this._networkFeeState.initialize();

        // Initialize the keyzone module
        await this._keyZoneState.initialize();

        // Calculate the state and initialize the interval
        await this.calculateState();
        this.stateInterval = setInterval(async () => {
            try { await this.calculateState() } 
            catch (e) { 
                console.error(e);
                this._apiError.log("MarketStateService.calculateState", e)
            }
        }, this.intervalSeconds * 1000);
    }





    /**
     * Stops the market state interval as well as the submodules'
     */
    public stop(): void {
        if (this.stateInterval) clearInterval(this.stateInterval);
        this.stateInterval = undefined;
        this._keyZoneState.stop();
        this._networkFeeState.stop();
    }








    



    /**************
     * Retrievers *
     **************/



    /**
     * Calculates and broadcasts the current market state.
     * @returns Promise<void>
     */
    private async calculateState(): Promise<void> {
        // Retrieve the candlesticks window
        const window: ICandlestick[] = await this._candlestick.getLast(true, this.windowSize);

        // Broadcast the new state as long as there are enough candlesticks
        if (window.length == this.windowSize) {
            this.active.next({
                window: this._windowState.calculateState(window),
                volume: this._volumeState.calculateState(window),
                keyzone: this._keyZoneState.calculateState(window.at(-1).c),
                network_fee: this._networkFeeState.state
            });
        }
    }


    


    /**
     * Retrieves the default market state. It can be built even
     * if the submodules have not yet been initialized.
     * @returns IMarketState
     */
     private getDefaultState(): IMarketState {
        return {
            window: this._windowState.getDefaultState(),
            volume: this._volumeState.getDefaultState(),
            keyzone: this._keyZoneState.getDefaultState(),
            network_fee: this._networkFeeState.getDefaultState()
        }
    }
}