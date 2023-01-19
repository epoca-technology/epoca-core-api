import {injectable, inject, postConstruct} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { INotificationService } from "../notification";
import { IUtilitiesService } from "../utilities";
import { 
    IMarketStateService,
    IMarketState,
    IWindowStateService,
    IVolumeStateService,
    INetworkFeeStateService,
    IWindowState,
    IVolumeState,
    IOpenInterestStateService,
    ILongShortRatioStateService,
    ITechnicalAnalysisStateService,
} from "./interfaces";




@injectable()
export class MarketStateService implements IMarketStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.WindowStateService)                 private _windowState: IWindowStateService;
    @inject(SYMBOLS.VolumeStateService)                 private _volumeState: IVolumeStateService;
    @inject(SYMBOLS.NetworkFeeStateService)             private _networkFeeState: INetworkFeeStateService;
    @inject(SYMBOLS.OpenInterestStateService)           private _openInterest: IOpenInterestStateService;
    @inject(SYMBOLS.LongShortRatioStateService)         private _longShortRatio: ILongShortRatioStateService;
    @inject(SYMBOLS.TechnicalAnalysisStateService)      private _ta: ITechnicalAnalysisStateService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Window Size
     * The number of prediction candlesticks that comprise the window.
     */
    private readonly windowSize: number = 64;


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
    private readonly priceStateThrottleMinutes: number = 60;
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
        // Initialize the network fee module
        await this._networkFeeState.initialize();

        // Initialize the open interest module after a small delay
        await this._utils.asyncDelay(10);
        await this._openInterest.initialize();

        // Initialize the long/short ratio module after a small delay
        await this._utils.asyncDelay(10);
        await this._longShortRatio.initialize();

        // Initialize the Technical Analysis Module
        await this._ta.initialize();

        // Calculate the state and initialize the interval
        await this.calculateState();
        this.candlestickStreamSub = this._candlestick.stream.subscribe(async (c) => {
            try { await this.calculateState() } 
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
        this._openInterest.stop();
        this._longShortRatio.stop();
        this._networkFeeState.stop();
        this._ta.stop();
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
        const window: ICandlestick[] = this._candlestick.predictionLookback.slice(-this.windowSize);

        // Broadcast the new state as long as there are enough candlesticks
        if (window.length == this.windowSize) {
            // Calculate the states
            const windowState: IWindowState = this._windowState.calculateState(window);
            const volumeState: IVolumeState = this._volumeState.calculateState(window);

            // Broadcast the states through the observables
            this.active.next({
                window: windowState,
                volume: volumeState,
                network_fee: this._networkFeeState.state,
                open_interest: this._openInterest.state,
                long_short_ratio: this._longShortRatio.state,
                technical_analysis: this._ta.state
            });

            // Check if there is a window state and if can be broadcasted
            if (
                windowState.state != 0 && 
                (
                    this.priceStateLastNotification == undefined ||
                    this.priceStateLastNotification < moment(windowState.ts).subtract(this.priceStateThrottleMinutes, "minutes").valueOf()
                )
            ) {
                await this._notification.windowState(windowState.state, windowState.state_value, windowState.window.at(-1).c);
                this.priceStateLastNotification = windowState.ts;
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
            network_fee: this._networkFeeState.getDefaultState(),
            open_interest: this._openInterest.getDefaultState(),
            long_short_ratio: this._longShortRatio.getDefaultState(),
            technical_analysis: this._ta.getDefaultState()
        }
    }
}