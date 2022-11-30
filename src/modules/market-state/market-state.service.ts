import {injectable, inject, postConstruct} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickModel, ICandlestickService } from "../candlestick";
import { INotificationService } from "../notification";
import { IUtilitiesService } from "../utilities";
import { 
    IMarketStateService,
    IMarketState,
    IWindowStateService,
    IVolumeStateService,
    IKeyZonesStateService,
    INetworkFeeStateService,
    IWindowState,
    IVolumeState,
    IKeyZoneState,
    INetworkFeeState,
    IOpenInterestStateService,
    IOpenInterestState,
    ILongShortRatioStateService,
    ILongShortRatioState
} from "./interfaces";




@injectable()
export class MarketStateService implements IMarketStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.CandlestickModel)                   private _candlestickModel: ICandlestickModel;
    @inject(SYMBOLS.WindowStateService)                 private _windowState: IWindowStateService;
    @inject(SYMBOLS.VolumeStateService)                 private _volumeState: IVolumeStateService;
    @inject(SYMBOLS.KeyZonesStateService)               private _keyZoneState: IKeyZonesStateService;
    @inject(SYMBOLS.NetworkFeeStateService)             private _networkFeeState: INetworkFeeStateService;
    @inject(SYMBOLS.OpenInterestStateService)           private _openInterest: IOpenInterestStateService;
    @inject(SYMBOLS.LongShortRatioStateService)         private _longShortRatio: ILongShortRatioStateService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Window Size
     * The number of prediction candlesticks that comprise the window.
     */
    private window: ICandlestick[] = [];
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
    private readonly priceStateThrottleMinutes: number = 30;
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

        // Initialize the keyzone module
        await this._keyZoneState.initialize();

        // Initialize the open interest module after a small delay
        await this._utils.asyncDelay(2);
        await this._openInterest.initialize();

        // Initialize the long/short ratio module after a small delay
        await this._utils.asyncDelay(2);
        await this._longShortRatio.initialize();

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
        const window: ICandlestick[] = await this.getWindowCandlesticks();

        // Broadcast the new state as long as there are enough candlesticks
        if (window.length == this.windowSize) {
            // Calculate the states
            const windowState: IWindowState = this._windowState.calculateState(window);
            const volumeState: IVolumeState = this._volumeState.calculateState(window);
            const keyzoneState: IKeyZoneState = this._keyZoneState.calculateState(window.at(-1).c);
            const networkFeeState: INetworkFeeState = this._networkFeeState.state;
            const openInterestState: IOpenInterestState = this._openInterest.state;
            const longShortRatioState: ILongShortRatioState = this._longShortRatio.state;

            // Broadcast the states through the observables
            this.active.next({
                window: windowState,
                volume: volumeState,
                keyzone: keyzoneState,
                network_fee: networkFeeState,
                open_interest: openInterestState,
                long_short_ratio: longShortRatioState,
            });

            // Check if there is a window state and if can be broadcasted
            if (
                windowState.state != "stateless" && 
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
     * Retrieves the candlesticks in the window based on their current
     * state. If they have been initialized, only the tail is downloaded.
     * @returns Promise<ICandlestick[]>
     */
    private async getWindowCandlesticks(): Promise<ICandlestick[]> {
        // Check if the candlesticks have already been set
        if (this.window.length == this.windowSize) {
            // Retrieve the tail
            const tail: ICandlestick[] = await this._candlestick.getForPeriod(
                this.window.at(-1).ot, 
                moment(this.window.at(-1).ot).add(7, "days").valueOf(), 
                this._candlestickModel.predictionConfig.intervalMinutes
            );

            // Update the last candlestick and return the window
            if (tail.length == 1) {
                this.window[this.window.length - 1] = tail[0];
                return this.window;
            }

            /**
             * Remove the last window from the head, concatenate the tail
             * and apply a slice to match the window size.
             */
            else if (tail.length > 1) {
                const head: ICandlestick[] = this.window.slice(0, this.window.length - 1);
                this.window = head.concat(tail).slice(-this.windowSize);
                return this.window;
            }

            // Something went wrong.
            else {
                console.log("The window candlesticks tail retrieved is empty.");
                return [];
            }
        }

        // Otherwise, load the entire list and populate the local property
        else {
            const candlesticks: ICandlestick[] = await this._candlestick.getLast(true, this.windowSize);
            this.window = candlesticks;
            return candlesticks;
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
            network_fee: this._networkFeeState.getDefaultState(),
            open_interest: this._openInterest.getDefaultState(),
            long_short_ratio: this._longShortRatio.getDefaultState()
        }
    }
}