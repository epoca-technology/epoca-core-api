import {injectable, inject, postConstruct} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickService, ICandlestickStream } from "../candlestick";
import { INotificationService } from "../notification";
import { IUtilitiesService } from "../utilities";
import { 
    IMarketStateService,
    IMarketState,
    IWindowStateService,
    IVolumeStateService,
    IWindowState,
    IKeyZonesStateService,
    ILiquidityStateService,
    ITrendStateService,
    ICoinsService,
    IKeyZoneState,
} from "./interfaces";




@injectable()
export class MarketStateService implements IMarketStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.WindowStateService)                 private _windowState: IWindowStateService;
    @inject(SYMBOLS.VolumeStateService)                 private _volumeState: IVolumeStateService;
    @inject(SYMBOLS.LiquidityService)                   private _liquidity: ILiquidityStateService;
    @inject(SYMBOLS.KeyZonesStateService)               private _keyZones: IKeyZonesStateService;
    @inject(SYMBOLS.TrendStateService)                  private _trend: ITrendStateService;
    @inject(SYMBOLS.CoinsService)                       private _coins: ICoinsService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Window Size
     * The number of prediction candlesticks that comprise the window.
     */
    private readonly windowSize: number = 128;


    /**
     * Candlestick Stream Subscription
     * Every time new data becomes available, the market state is calculated.
     */
    private candlestickStreamSub: Subscription;


    /**
     * Active Market State
     * Whenever a new market state is calculated, it is broadcasted and stored in this
     * variable.
     */
    public active: BehaviorSubject<IMarketState>;


    /**
    * Price State
    * Whenever a price state (increasing|decreasing) is detected, it will notify the
    * users in a throttled manner.
    */
    private readonly priceStateThrottleMinutes: number = 90;
    private priceStateLastNotification: number|undefined = undefined;


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
        // Initialize the window module
        await this._windowState.initialize();
        
        // Initialize the Liquidity Module
        await this._liquidity.initialize();

        // Initialize the KeyZones
        await this._keyZones.initialize();

        // Initialize the trend state
        await this._trend.initialize();

        // Initialize the coins state
        await this._coins.initialize();

        // Calculate the state and initialize the interval
        await this.calculateState();
        this.candlestickStreamSub = this._candlestick.stream.subscribe(async (stream: ICandlestickStream) => {
            try { if (this._candlestick.isStreamInSync(stream)) await this.calculateState() } 
            catch (e) { 
                console.error(e);
                this._apiError.log("MarketStateService.calculateState", e)
            }
        });
    }





    /**
     * Stops the market state interval as well as the submodules'
     */
    public stop(): void {
        if (this.candlestickStreamSub) this.candlestickStreamSub.unsubscribe();
        this._liquidity.stop();
        this._keyZones.stop();
        this._trend.stop();
        this._coins.stop();
    }








    



    /**************
     * Calculator *
     **************/



    /**
     * Calculates and broadcasts the current market state.
     * @returns Promise<void>
     */
    private async calculateState(): Promise<void> {
        // Retrieve the candlesticks window
        const window: ICandlestick[] = this._candlestick.predictionLookback.slice(-this.windowSize);

        // Broadcast the new state as long as there are enough candlesticks
        if (window.length == this.windowSize) {
            // Calculate the states
            const windowState: IWindowState = this._windowState.calculateState(window);

            // Broadcast the states through the observables
            this.active.next({
                window: windowState,
                volume: this._volumeState.calculateState(window),
                keyzones: <IKeyZoneState>this._keyZones.calculateState(windowState.ss),
                trend: this._trend.state,
                coins: this._coins.calculateState()
            });

            // Check if there is a window state and if can be broadcasted
            if (
                (windowState.s == 2 || windowState.s == -2) && 
                (
                    this.priceStateLastNotification == undefined ||
                    this.priceStateLastNotification < moment().subtract(this.priceStateThrottleMinutes, "minutes").valueOf()
                )
            ) {
                await this._notification.windowState(windowState.s, windowState.ss.s100.c, windowState.w.at(-1).c);
                this.priceStateLastNotification = Date.now();
            }
        } else {
            console.log(`Could not calculate the market state because received an incorrect number of candlesticks: ${window.length}`);
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
            keyzones: this._keyZones.getDefaultState(),
            trend: this._trend.getDefaultState(),
            coins: this._coins.getDefaultState()
        }
    }
}