import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IDatabaseService } from "../database";
import { INumberConfig, IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IKeyZone,
    IKeyZonesStateService, 
    IKeyZoneState,
    IKeyZoneFullState,
    IKeyZonePriceRange,
    IReversalType,
    IReversal,
    IMinifiedKeyZone,
    IKeyZoneVolumeIntensity,
    ILiquidityStateService,
    ILiquidityState,
    IKeyZoneStateEvent,
    ILiquiditySideBuild,
    IIdleKeyZones,
    IKeyZoneStateEventKind,
    ISplitStates,
    IKeyZonesConfiguration
} from "./interfaces";




@injectable()
export class KeyZonesStateService implements IKeyZonesStateService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.LiquidityService)                   private _liquidity: ILiquidityStateService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * The configuration that will be used in order to output numbers.
     */
    private readonly numberConfig: INumberConfig = { dp: 0, ru: true };

    /**
     * Configuration
     * The object containing all the configuration values that will be used
     * in order to build and calculate the state of the KeyZones.
     */
    public config: IKeyZonesConfiguration;



    /**
     * KeyZones
     * The list of KeyZones detected in the retrieved candlesticks.
     */
    private zones: IKeyZone[] = [];



    /**
     * Temporary KeyZones
     * This variable is used to store the keyzones as they are being built.
     * Once the process is completed, it is transferred to the zones property.
     */
    private tempZones: IKeyZone[] = [];



    /**
     * Price
     * Every time the state is calculated, the current price and the snapshots
     * are updated.
     */
    private currentPrice: number;
    private priceSnapshots: ICandlestick[] = [];


    /**
     * Event
     * When the price is increasing or decreasing and hits a KeyZone that isn't idle
     * and which score is greater than or equals to eventScoreRequirement, an event
     * is created and emmited. This event lasts for eventDurationSeconds and 
     * sets the KeyZone on idle state for keyzoneIdleOnEventMinutes.
     * Keep in mind the KeyZone score is a float ranging from 0 to 10.
     */
    private idleKeyZones: IIdleKeyZones = {}; // ID: Idle Until Timestamp


    /**
     * State
     * The KeyZone state is stored locally and updated every time it is calculated.
     * The reason this copy needs to be kept is because the state event needs to 
     * be calculated based on the previous levels, before the scores are recalculated.
     */
    private state: IKeyZoneState;


    /**
     * KeyZones Build Interval
     * Every intervalSeconds, the keyzones will be built based on the latest data.
     */
    private buildInterval: any;
    private buildTS: number = 0;



    constructor() {}


    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultState();
    }










    /***************
     * Initializer *
     ***************/






    /**
     * Builds the KeyZones and initializes the interval that will
     * update them every intervalSeconds.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the configuration
        await this.initializeConfiguration();

        // Build the KeyZones and initialize the interval
        this.updateBuild();
        this.buildInterval = setInterval(async () => {
            try { this.updateBuild() } 
            catch (e) { 
                console.error(e);
                this._apiError.log("KeyZonesState.initialize.interval", e)
            }
        }, this.config.buildFrequencyHours * 60 * 60 * 1000);
    }





    /**
     * Stops the build interval.
     */
    public stop(): void {
        if (this.buildInterval) clearInterval(this.buildInterval);
        this.buildInterval = undefined;
        this.idleKeyZones = {};
    }


















    


    /*********************
     * State Calculation *
     *********************/




    /**
     * Calculates the state based on the current price.
     * @param windowSplitStates? <- Must be provided unless calculating the full state
     * @param fullState? 
     * @returns IKeyZoneState|IKeyZoneFullState
     */
    public calculateState(windowSplitStates?: ISplitStates, fullState?: boolean): IKeyZoneState|IKeyZoneFullState {
        // Firstly, update the price
        this.updatePrice();

        // Check if the price is currently in a keyzone
        const active: IKeyZone|undefined = this.zones.filter((z) => this.currentPrice >= z.s && this.currentPrice <= z.e)[0];

        // Check if the full state payload should be calculated
        if (fullState) {
            return <IKeyZoneFullState>{
                active: active || null,
                above: this.getZonesFromPrice(this.currentPrice, true),
                below: this.getZonesFromPrice(this.currentPrice, false),
                price_snapshots: this.priceSnapshots,
                idle: this.idleKeyZones,
                build_ts: this.buildTS
            };
        } 
        
        // Otherwise, calculate the active state
        else {
            // Handle the state event
            const event: IKeyZoneStateEvent|null = this.buildStateEvent(windowSplitStates);

            // Init the state zones
            const { above, below } = this.getStateKeyZonesFromCurrentPrice();

            // Retrieve the liquidity state
            const liq: ILiquidityState = this._liquidity.calculateState(this.currentPrice);

            // Update the state and return it
            this.state = {
                event: event,
                active: active ? this.minifyKeyZone(active, 0, 0): null,
                above: this.buildStateKeyZones(above, liq.a),
                below: this.buildStateKeyZones(below, liq.b),
            }
            return <IKeyZoneState>this.state;
        }
    }






    /**
     * Retrieves all the state KeyZones and calculates their volume 
     * intensity.
     * @returns {above: IKeyZone[], below: IKeyZone[]}
     */
    private getStateKeyZonesFromCurrentPrice(): {above: IKeyZone[], below: IKeyZone[]} {
        // Init the zones
        let above: IKeyZone[] = this.getZonesFromPrice(this.currentPrice, true, this.config.stateLimit);
        let below: IKeyZone[] = this.getZonesFromPrice(this.currentPrice, false, this.config.stateLimit);

        // Iterate over each zone and calculate the required volume values
        let volSum: number = 0;
        let volLow: number = 0;
        let volHigh: number = 0;
        for (let zone of above.concat(below)) {
            volSum += zone.vm;
            volLow = volLow == 0 || zone.vm < volLow ? zone.vm: volLow;
            volHigh = zone.vm > volHigh ? zone.vm: volHigh;
        }

        // Calculate the requirements
        const volMean: number = volSum  / (above.length + below.length);
        const lowRequirement: number = <number>this._utils.calculateAverage([volMean, volLow]);
        const mediumRequirement: number = <number>this._utils.calculateAverage([volMean, lowRequirement]);
        const highRequirement: number = <number>this._utils.calculateAverage([volMean, volHigh]);
        const veryHighRequirement: number = <number>this._utils.calculateAverage([highRequirement, volHigh]);
        
        // Iterate over each KeyZone above and calculate the volume intensity
        for (let i = 0; i < above.length; i++) {
            above[i].vi = this.calculateVolumeIntensity(above[i].vm, lowRequirement, mediumRequirement, highRequirement, veryHighRequirement);
        }
        
        // Iterate over each KeyZone below and calculate the volume intensity
        for (let i = 0; i < below.length; i++) {
            below[i].vi = this.calculateVolumeIntensity(below[i].vm, lowRequirement, mediumRequirement, highRequirement, veryHighRequirement);
        }

        // Finally, return the build
        return { above: above, below: below};
    }







    /**
     * Calculates the volume intensity for a KeyZone based on the volume
     * recorded in it.
     * @param vol 
     * @param low 
     * @param medium 
     * @param high 
     * @param veryHigh 
     * @returns IKeyZoneVolumeIntensity
     */
    private calculateVolumeIntensity(vol: number, low: number, medium: number, high: number, veryHigh: number): IKeyZoneVolumeIntensity {
        if      (vol >= veryHigh)   { return 4 }
        else if (vol >= high)       { return 3 }
        else if (vol >= medium)     { return 2 }
        else if (vol >= low)        { return 1 }
        else                        { return 0 }
    }













    /* KeyZone Event Build */





    /**
     * Manages the detecting and management of state events. If no event is found
     * or one has expired, it returns null.
     * @param windowSplitStates
     * @returns IKeyZoneStateEvent|null
     */
    private buildStateEvent(windowSplitStates: ISplitStates): IKeyZoneStateEvent|null {
        // Initialize the event (if any)
        let evt: IKeyZoneStateEvent|null = this.state && this.state.event ? this.state.event: null;

        // If there is an event, ensure it is still active, otherwise, null it
        if (evt && !this.isEventActive(evt.e)) evt = null;

        // Look for an event if there are enough price snapshots
        if (this.priceSnapshots.length == this.config.priceSnapshotsLimit) {
            /**
             * Support Event Requirements:
             * 1) The initial price snapshot must be greater than the current (Decreased)
             * 2) The window split states for the 2% and 5% of the dataset must be decreasing
             * 3) The low from the current 15-minute-interval candlestick must be lower than 
             * the previous one.
             * 4) There must be zones below
             */
            if (
                this.priceSnapshots[0].o > this.priceSnapshots.at(-1).c &&
                windowSplitStates.s5.s <= 0 &&
                windowSplitStates.s2.s <= -1 &&
                this._candlestick.predictionLookback.at(-1).l < this._candlestick.predictionLookback.at(-2).l &&
                this._candlestick.predictionLookback.at(-1).c < this._candlestick.predictionLookback.at(-2).c &&
                this.state.below.length
            ) {
                /**
                 * Retrieve the active KeyZone from below (if any). A Support KeyZone is active if:
                 * 1) The current snapshot's close price is within a KeyZone OR the current snapshot's 
                 * low is within a KeyZone and the current low is lower to the previous low. The second
                 * way of activating a KeyZone was implemented in order to not miss the events in which 
                 * the price touches the KeyZone for a very brief period of time and then reverses.
                 * 2) And the KeyZone's Score is greater than or equals to the eventScoreRequirement
                 * 3) And the KeyZone is not idle
                 * 4) And the KeyZone Start Price is less than or equals to the prediction candlestick's low.
                 */
                const activeZones: IMinifiedKeyZone[] = this.state.below.filter(
                    (z) =>  (
                        (this.priceSnapshots.at(-1).c >= z.s && this.priceSnapshots.at(-1).c <= z.e) ||
                        (this.priceSnapshots.at(-1).l >= z.s && this.priceSnapshots.at(-1).l <= z.e)
                    ) &&
                    z.scr >= this.config.eventScoreRequirement &&
                    !this.isIdle(z.id) &&
                    z.s <= this._candlestick.predictionLookback.at(-1).l
                );

                // If zones were found, pick the one that is further down
                let active: IMinifiedKeyZone|undefined = activeZones.length > 0 ? activeZones.at(-1): undefined;

                /**
                 * If there is an active support event, ensure the active support is from
                 * below, otherwise, unset it so an event is not issued.
                 */
                if (evt && active && active.s >= evt.kz.s) active = undefined;

                // If an event was found, set it
                if (active) evt = this.onKeyZoneEvent(active, "s");
            }

            /**
             * Resistance Event Requirements:
             * 1) The initial price snapshot must be lower than the current(Increased)
             * 2) The window split states for the 2% and 5% of the dataset must be increasing
             * 3) The high from the current 15-minute-interval candlestick must be higher than 
             * the previous one.
             * 4) There must be zones above
             */
            else if (
                this.priceSnapshots[0].o < this.priceSnapshots.at(-1).c &&
                windowSplitStates.s5.s >= 0 &&
                windowSplitStates.s2.s >= 1 &&
                this._candlestick.predictionLookback.at(-1).h > this._candlestick.predictionLookback.at(-2).h &&
                this._candlestick.predictionLookback.at(-1).c > this._candlestick.predictionLookback.at(-2).c &&
                this.state.above.length
            ) {
                /**
                 * Retrieve the active KeyZone from above (if any). A Resistance KeyZone is active if:
                 * 1) The current snapshot's close price is within a KeyZone OR the current snapshot's 
                 * high is within a KeyZone and the current high is higher to the previous high. The second
                 * way of activating a KeyZone was implemented in order to not miss the events in which 
                 * the price touches the KeyZone for a very brief period of time and then reverses.
                 * 2) And the KeyZone's Score is greater than or equals to the eventScoreRequirement
                 * 3) And the KeyZone is not idle
                 * 4) And the KeyZone End Price is greater than or equals to the prediction candlestick's high.
                 */
                let activeZones: IMinifiedKeyZone[] = this.state.above.filter(
                    (z) =>  (
                        (this.priceSnapshots.at(-1).c >= z.s && this.priceSnapshots.at(-1).c <= z.e) ||
                        (this.priceSnapshots.at(-1).h >= z.s && this.priceSnapshots.at(-1).h <= z.e)
                    ) &&
                    z.scr >= this.config.eventScoreRequirement &&
                    !this.isIdle(z.id) &&
                    z.e >= this._candlestick.predictionLookback.at(-1).h
                );

                // If zones were found, pick the one that is further up
                let active: IMinifiedKeyZone|undefined = activeZones.length > 0 ? activeZones.at(-1): undefined;

                /**
                 * If there is an active resistance event, ensure the active resistance is from
                 * above, otherwise, unset it so an event is not issued.
                 */
                if (evt && active && active.s <= evt.kz.s) active = undefined;

                // If an event was found, set it
                if (active) evt = this.onKeyZoneEvent(active, "r");
            }
        }

        // Finally, return the event
        return evt;
    }






    /**
     * Builds the KeyZone State event object and activates the idle when an
     * event is detected.
     * @param zone 
     * @param kind 
     * @returns IKeyZoneStateEvent
     */
    private onKeyZoneEvent(zone: IMinifiedKeyZone, kind: IKeyZoneStateEventKind): IKeyZoneStateEvent {
        // If the event is a support contact, activate the idle on all the supports above
        if (kind == "s") {
            for (let support of this.state.below) {
                if (zone.s <= support.s) this.activateIdle(support.id);
            }
        }

        // If the event is a resistance contact, activate the idle on all the resitances below
        else {
            for (let resistance of this.state.above) {
                if (zone.s >= resistance.s) this.activateIdle(resistance.id);
            }
        }

        // Return the event's build
        return {
            k: kind,
            kz: zone,
            t: Date.now(),
            e: moment().add(kind == "s" ? this.config.supportEventDurationSeconds: this.config.resistanceEventDurationSeconds, "seconds").valueOf()
        }
    }




    /**
     * Checks if an event is still active based on its expiry.
     * @param expiry 
     * @returns boolean
     */
    private isEventActive(expiry: number): boolean { return Date.now() <= expiry }







    // Idle Helpers


    /**
     * Checks if a KeyZone is currently on Idle State.
     * @param id 
     * @returns boolean
     */
    private isIdle(id: number): boolean { 
        return typeof this.idleKeyZones[id] == "number" && Date.now() < this.idleKeyZones[id];
    }



    /**
     * Activates the idle state on a KeyZone based on its ID.
     * @param id 
     */
    private activateIdle(id: number): void {
        this.idleKeyZones[id] = moment().add(this.config.keyzoneIdleOnEventMinutes, "minutes").valueOf();
    }

















    /* State KeyZones Build */




    /**
     * Builds the KeyZone object that is used by the state. Apart from inserting
     * all essential info, it also inserts the liquidity share and the score.
     * @param zones 
     * @param sideLiquidity 
     * @returns IMinifiedKeyZone[]
     */
    private buildStateKeyZones(zones: IKeyZone[], sideLiquidity: ILiquiditySideBuild): IMinifiedKeyZone[] {
        // Init the list of zones
        let finalZones: IMinifiedKeyZone[] = [];

        // Iterate over each zone
        for (let zone of zones) {
            // Init the range that will be used to calculate the accumulated liquidity
            const start: number = Math.floor(zone.s - 1);
            const end: number = Math.ceil(zone.e + 1);

            // Calculate the accum liquidity
            const accumulatedLiquidity: number = sideLiquidity.l.reduce((a, b) => a + (b.p >= start && b.p <= end ? b.l: 0), 0);

            // Calculate the liquidity share
            const liquidityShare: number = <number>this._utils.calculatePercentageOutOfTotal(accumulatedLiquidity, sideLiquidity.t);

            // Calculate the KeyZone's Score
            const score: number = this.calculateKeyZoneScore(zone.vi, liquidityShare);

            // Add the processed/minified KeyZone to the list
            finalZones.push(this.minifyKeyZone(zone, liquidityShare, score));
        }

        // Finally, return the list
        return finalZones;
    }








    /* KeyZone Score Calculation */



    /**
     * Calculates the KeyZone's score based on the volume intensity and 
     * the liquidity share.
     * @param volIntensity 
     * @param liquidityShare 
     * @returns number
     */
    private calculateKeyZoneScore(
        volIntensity: IKeyZoneVolumeIntensity, 
        liquidityShare: number
    ): number { 
        // Init the score
        let score: number = 0;

        // Calculate the volume intensity score
        score += this.calculateVolumeIntensityScore(volIntensity);

        // Calculate the liquidity share score
        score += this.calculateLiquidityShareScore(liquidityShare);

        // Finally, return it
        return <number>this._utils.outputNumber(score);
    }





    /**
     * Calculates the score of the KeyZone's Volume Intensity.
     * @param volIntensity 
     * @returns number
     */
    private calculateVolumeIntensityScore(volIntensity: IKeyZoneVolumeIntensity): number {
        // Init the score
        let score: number = 0.25;

        // Set the score accordingly
        if      (volIntensity == 4) { score = 1 }
        else if (volIntensity == 3) { score = 0.75 }
        else if (volIntensity == 2) { score = 0.6  }
        else if (volIntensity == 1) { score = 0.45 }

        // Finally, return the local score multiplied by the weights
        return this.config.scoreWeights.volume_intensity * score;
    }






    /**
     * Calculates the score of the KeyZone's Liquidity Share.
     * @param volIntensity 
     * @returns number
     */
    private calculateLiquidityShareScore(liquidityShare: number): number {
        // Init the score
        let score: number = 0.25;

        // Set the score accordingly
        if      (liquidityShare >= 17)      { score = 1 }
        else if (liquidityShare >= 16.5)    { score = 0.99 }
        else if (liquidityShare >= 16)      { score = 0.98 }
        else if (liquidityShare >= 15.5)    { score = 0.97 }
        else if (liquidityShare >= 15)      { score = 0.96 }
        else if (liquidityShare >= 14.5)    { score = 0.95 }
        else if (liquidityShare >= 14)      { score = 0.94 }
        else if (liquidityShare >= 13.5)    { score = 0.93 }
        else if (liquidityShare >= 13)      { score = 0.92 }
        else if (liquidityShare >= 12.5)    { score = 0.91 }
        else if (liquidityShare >= 12)      { score = 0.90 }
        else if (liquidityShare >= 11.5)    { score = 0.89 }
        else if (liquidityShare >= 11)      { score = 0.88 }
        else if (liquidityShare >= 10.5)    { score = 0.86 }
        else if (liquidityShare >= 10)      { score = 0.84 }
        else if (liquidityShare >= 9.5)     { score = 0.82 }
        else if (liquidityShare >= 9)       { score = 0.80 }
        else if (liquidityShare >= 8.5)     { score = 0.78 }
        else if (liquidityShare >= 8)       { score = 0.76 }
        else if (liquidityShare >= 7.5)     { score = 0.74 }
        else if (liquidityShare >= 7)       { score = 0.72 }
        else if (liquidityShare >= 6.5)     { score = 0.69 }
        else if (liquidityShare >= 6)       { score = 0.66 }
        else if (liquidityShare >= 5.5)     { score = 0.63 }
        else if (liquidityShare >= 5)       { score = 0.60 }
        else if (liquidityShare >= 4.5)     { score = 0.57 }
        else if (liquidityShare >= 4)       { score = 0.54 }
        else if (liquidityShare >= 3.5)     { score = 0.51 }
        else if (liquidityShare >= 3)       { score = 0.48 }
        else if (liquidityShare >= 2.5)     { score = 0.44 }
        else if (liquidityShare >= 2)       { score = 0.40 }
        else if (liquidityShare >= 1.5)     { score = 0.36 }
        else if (liquidityShare >= 1)       { score = 0.32 }
        else if (liquidityShare >= 0.5)     { score = 0.28 }

        // Finally, return the local score multiplied by the weights
        return this.config.scoreWeights.liquidity_share * score;
    }

    









    /* State Calculation Misc Helpers */






    /**
     * Retrieves all the keyzones below or above from the current price.
     * @param price 
     * @param above 
     * @param limit? 
     * @returns IKeyZone[]
     */
    private getZonesFromPrice(price: number, above: boolean, limit?: number): IKeyZone[] {
        // Init the zones below or above
        let zones: IKeyZone[] = this.zones.filter((z) => (above && z.s > price) || (!above && z.e < price));

        /**
         * Order the zones based on the proximity to the price.
         * Zones Above: Order ascending by price
         * Zones Below: Order descending by price
         */
        if (above) { zones.sort((a, b) => { return a.s - b.s}) } 
        else { zones.sort((a, b) => { return b.s - a.s}) }

        // Return the zones
        return typeof limit == "number" ? zones.slice(0, limit): zones;
    }





    /**
     * Minifies a KeyZone based on the full record.
     * @param zone 
     * @param liquidityShare 
     * @param score 
     * @returns IMinifiedKeyZone
     */
    private minifyKeyZone(zone: IKeyZone, liquidityShare: number, score: number): IMinifiedKeyZone { 
        return { 
            id: zone.id, 
            s: zone.s, 
            e: zone.e, 
            vi: zone.vi,
            ls: liquidityShare,
            scr: score
        } 
    }



    




    /**
     * Retrieves the module's default active state.
     * @returns IKeyZoneState
     */
    public getDefaultState(): IKeyZoneState { return { event: null, active: null, above: [], below: [] } }
    











    /* Price Management */





    /**
     * Prior to the KeyZone State being calculated, the price and
     * the snaptshots are updated in order to be able to build 
     * the state and identify events.
     */
    private updatePrice(): void {
        // Initialize the candlestick
        const candle: ICandlestick = this._candlestick.stream.value.candlesticks.at(-1);

        // Append the candlestick to the list of snapshots
        this.priceSnapshots.push(candle);

        // Set the current price
        this.currentPrice = candle.c;

        // Slice the list of snaps and keep only the neccessary ones
        if (this.priceSnapshots.length > this.config.priceSnapshotsLimit) {
            this.priceSnapshots = this.priceSnapshots.slice(-this.config.priceSnapshotsLimit);
        }
    }


























    /******************
     * KeyZones Build *
     ******************/






    /**
     * Retrieves the last 30 days worth of candlesticks and builds the 
     * Keyzones.
     * @returns void
     */
    private updateBuild(): void {
        // Retrieve the candlesticks
        const candlesticks: ICandlestick[] = this._candlestick.predictionLookback.slice(-this.config.buildLookbackSize);

        /**
         * Iterate over each candlestick scanning for reversals. The loop starts on the fourth 
         * item and ends on the fourth to last item as for a reversal to be detected it needs:
         * Resistance:  Higher than the previous 3 and next 3 candlesticks
         * Support:  Lower than the previous 3 and next 3 candlesticks
         */
         for (let i = 3; i < candlesticks.length - 3; i++) {
            // Check if a resistance reversal has occurred
            if (
                candlesticks[i].h > candlesticks[i - 3].h &&
                candlesticks[i].h > candlesticks[i - 2].h &&
                candlesticks[i].h > candlesticks[i - 1].h &&
                candlesticks[i].h > candlesticks[i + 1].h &&
                candlesticks[i].h > candlesticks[i + 2].h &&
                candlesticks[i].h > candlesticks[i + 3].h
            ) { this.onReversal(candlesticks[i], "r") }

            // Check if a support reversal has occurred
            else if (
                candlesticks[i].l < candlesticks[i - 3].l &&
                candlesticks[i].l < candlesticks[i - 2].l &&
                candlesticks[i].l < candlesticks[i - 1].l &&
                candlesticks[i].l < candlesticks[i + 1].l &&
                candlesticks[i].l < candlesticks[i + 2].l &&
                candlesticks[i].l < candlesticks[i + 3].l
            ) { this.onReversal(candlesticks[i], "s") }
        }

        // Merge the nearby zones
        this.mergeNearbyTempZones();

        // Iterate over each zone and calculate the volume mean based on all the reversals within
        for (let i = 0; i < this.zones.length; i++) {
            this.zones[i].vm = <number>this._utils.calculateAverage(this.zones[i].r.map(r => r.v));
        }

        // Clean up the idle object
        for (let idleZoneID in this.idleKeyZones) {
            if (!this.isIdle(Number(idleZoneID))) delete this.idleKeyZones[idleZoneID];
        }

        // Finally, update the build time
        this.buildTS = Date.now();
    }





    /**
     * Once all the zones have been calculated, the ones that are closer than
     * zone_merge_distance_limit% are merged. Once the merge is complete,
     * it will clear the temporary zones and update the active ones.
     */
    private mergeNearbyTempZones(): void {
        // Init the final zones
        let finalZones: IKeyZone[] = [];

        // Sort the temp zones by start price ascending (low to high)
        this.tempZones.sort((a, b) => { return a.s - b.s });

        // Check if there zones that need to be merged
        let merged: boolean = false;
        for (let i = 0; i < this.tempZones.length; i++) {
            // Make sure there hasn't been a merge
            if (!merged) {
                // Check if there is a next item before proceeding
                if (this.tempZones[i + 1]) {
                    // Calculate the % change between the current end and the next start
                    const change: number = <number>this._utils.calculatePercentageChange(
                        this.tempZones[i].e, 
                        this.tempZones[i + 1].s,
                        {ru: true}
                    );
                    
                    // Merge the zones if needed
                    if (change <= this.config.zoneMergeDistanceLimit) {
                        finalZones.push(this.mergeZones(this.tempZones[i], this.tempZones[i + 1]));
                        merged = true;
                    } 
                    
                    // Otherwise, just add the zone
                    else { finalZones.push(this.tempZones[i]) }
                }

                // Checking last zone (unmerged), add it to the final list
                else { finalZones.push(this.tempZones[i]) }
            } 
            
            // The current item has already been merged with the previous one. Just skip it
            else { merged = false }
        }

        // Clear the temp keyzones and update the active ones
        this.tempZones = [];
        this.zones = finalZones;
    }





    /**
     * This function is invoked whenever a reversal is detected. It will check if the
     * reversal occurred inside an existing keyzone. If so, it updates it. Otherwise,
     * it adds the new key zone to the instance.
     * @param candlestick 
     * @param reversalType 
     */
    private onReversal(candlestick: ICandlestick, reversalType: IReversalType): void {
        // Firstly, calculate the price range
        const range: IKeyZonePriceRange = this.calculatePriceRange(candlestick, reversalType);

        // Check if the reversal took place in an existing zone
        const zoneIndex: number|undefined = this.reversedInZone(range);

        // If an index was found, update the zone with the new data
        if (typeof zoneIndex == "number") {
            // Add the new reversal
            this.tempZones[zoneIndex].r.push({ id: candlestick.ot, t: reversalType, v: candlestick.v });

            // Update the mutated state
            this.tempZones[zoneIndex].m = this.zoneMutated(this.tempZones[zoneIndex].r);
        }

        // The reversal took place in a new area, add it to the zones
        else {
            this.tempZones.push({
                id: candlestick.ot,
                s: range.s,
                e: range.e,
                r: [ {id: candlestick.ot, t: reversalType, v: candlestick.v } ],
                m: false,
                vm: 0,  // Volume Mean to be calculated once keyzones are built
                vi: 0   // Volume Intensity to be calculated once keyzones are built
            });
        }
    }






    /**
     * Based on a given price range, it will check if the reversal took
     * place in an existing zone. If so, it will return the index in which it
     * took place. Otherwise, it returns undefined.
     * @param priceRange 
     * @returns number|undefined
     */
    private reversedInZone(priceRange: IKeyZonePriceRange): number|undefined {
        // Iterate over each zone looking for a match
        for (let i = 0; i < this.tempZones.length; i++) {
            if (
                (priceRange.s >= this.tempZones[i].s && priceRange.s <= this.tempZones[i].e) ||
                (priceRange.e >= this.tempZones[i].s && priceRange.e <= this.tempZones[i].e)
            ) {
                // A matching zone has been found
                return i;
            }
        }
    
        // If no matches are found, return undefined
        return undefined;
    }





    /**
     * Converts 2 given zones into 1 by merging all its properties.
     * @param z1 
     * @param z2 
     * @returns IKeyZone
     */
    private mergeZones(z1: IKeyZone, z2: IKeyZone): IKeyZone {
        // Merge the reversals
        let reversals: IReversal[] = z1.r.concat(z2.r);

        // Order them by date ascending
        reversals.sort((a, b) => { return a.id - b.id });

        // Return the unified zone
        return {
            id: z1.id < z2.id ? z1.id: z2.id,
            s: <number>this._utils.calculateAverage([z1.s, z2.s], this.numberConfig),
            e: <number>this._utils.calculateAverage([z1.e, z2.e], this.numberConfig),
            r: reversals,
            m: this.zoneMutated(reversals),
            vm: 0,  // Volume Mean to be calculated once keyzones are built
            vi: 0   // Volume Intensity to be calculated once keyzones are built
        }
    }




    
    /**
     * Checks if a zone has mutated based on its reversals.
     * @param reversals 
     * @returns boolean
     */
    private zoneMutated(reversals: IReversal[]): boolean {
        // Init the list of types
        const types: IReversalType[] = reversals.map((r) => r.t);

        // Check if it has both types
        return types.includes("s") && types.includes("r");
    }





    /**
     * Calculates the price range of a keyzone based on the type of reversal.
     * @param candlestick 
     * @param reversalType 
     * @returns IKeyZonePriceRange
     */
    private calculatePriceRange(candlestick: ICandlestick, reversalType: IReversalType): IKeyZonePriceRange {
        // Check if it was a resistance
        if (reversalType == "r") {
            return {
                s: <number>this._utils.alterNumberByPercentage(candlestick.h, -(this.config.zoneSize), this.numberConfig),
                e: candlestick.h
            }
        }

        // Otherwise, it is a support
        else {
            return {
                s: candlestick.l,
                e: <number>this._utils.alterNumberByPercentage(candlestick.l, this.config.zoneSize, this.numberConfig)
            }
        }
    }






















    /*************************************
     * KeyZones Configuration Management *
     *************************************/





    /**
     * Initializes the KeyZones' Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: IKeyZonesConfiguration|undefined = await this.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the KeyZones' Configuration on the db, the local property
     * and executes a build.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: IKeyZonesConfiguration): Promise<void> {
        // Validate the request
        this.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;

        // Update the build
        this.updateBuild();
    }







    /**
     * Validates all the properties in a given configuration.
     * @param config 
     */
    private validateConfiguration(config: IKeyZonesConfiguration): void {
        if (!config || typeof config != "object") {
            console.log(config);
            throw new Error(this._utils.buildApiError(`The provided keyzones config object is invalid.`, 27000));
        }
        if (!this._val.numberValid(config.buildFrequencyHours, 1, 24)) {
            throw new Error(this._utils.buildApiError(`The provided buildFrequencyHours (${config.buildFrequencyHours}) is invalid.`, 27001));
        }
        if (!this._val.numberValid(config.buildLookbackSize, 150, 150000)) {
            throw new Error(this._utils.buildApiError(`The provided buildLookbackSize (${config.buildLookbackSize}) is invalid.`, 27010));
        }
        if (!this._val.numberValid(config.zoneSize, 0.01, 10)) {
            throw new Error(this._utils.buildApiError(`The provided zoneSize (${config.zoneSize}) is invalid.`, 27002));
        }
        if (!this._val.numberValid(config.zoneMergeDistanceLimit, 0.01, 10)) {
            throw new Error(this._utils.buildApiError(`The provided zoneMergeDistanceLimit (${config.zoneMergeDistanceLimit}) is invalid.`, 27003));
        }
        if (!this._val.numberValid(config.stateLimit, 2, 20)) {
            throw new Error(this._utils.buildApiError(`The provided stateLimit (${config.stateLimit}) is invalid.`, 27004));
        }
        if (
            !config.scoreWeights || typeof this.config.scoreWeights != "object" ||
            !this._val.numberValid(config.scoreWeights.volume_intensity, 1, 10) ||
            !this._val.numberValid(config.scoreWeights.liquidity_share, 1, 10) ||
            config.scoreWeights.volume_intensity + config.scoreWeights.liquidity_share != 10
        ) {
            console.log(config.scoreWeights);
            throw new Error(this._utils.buildApiError(`The provided scoreWeights are invalid.`, 27005));
        }
        if (!this._val.numberValid(config.priceSnapshotsLimit, 3, 50)) {
            throw new Error(this._utils.buildApiError(`The provided priceSnapshotsLimit (${config.priceSnapshotsLimit}) is invalid.`, 27006));
        }
        if (!this._val.numberValid(config.supportEventDurationSeconds, 5, 3600)) {
            throw new Error(this._utils.buildApiError(`The provided supportEventDurationSeconds (${config.supportEventDurationSeconds}) is invalid.`, 27011));
        }
        if (!this._val.numberValid(config.resistanceEventDurationSeconds, 5, 3600)) {
            throw new Error(this._utils.buildApiError(`The provided resistanceEventDurationSeconds (${config.resistanceEventDurationSeconds}) is invalid.`, 27012));
        }
        if (!this._val.numberValid(config.keyzoneIdleOnEventMinutes, 1, 1440)) {
            throw new Error(this._utils.buildApiError(`The provided keyzoneIdleOnEventMinutes (${config.keyzoneIdleOnEventMinutes}) is invalid.`, 27008));
        }
        if (!this._val.numberValid(config.eventScoreRequirement, 1, 10)) {
            throw new Error(this._utils.buildApiError(`The provided eventScoreRequirement (${config.eventScoreRequirement}) is invalid.`, 27009));
        }
    }










    /* Configuration Record Management */






    /**
     * Retrieves the KeyZones' Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IKeyZonesConfiguration|undefined>
     */
    private async getConfigurationRecord(): Promise<IKeyZonesConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.keyzones_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the KeyZones' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    private async createConfigurationRecord(defaultConfiguration: IKeyZonesConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.keyzones_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the KeyZones' Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    private async updateConfigurationRecord(newConfiguration: IKeyZonesConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.keyzones_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }









    /* Misc Helpers */


    /**
     * Builds the default KeyZones Configuration object in order
     * of the db record to be initialized.
     * @returns IKeyZonesConfiguration
     */
    private buildDefaultConfig(): IKeyZonesConfiguration {
        return {
            buildFrequencyHours: 6,
            buildLookbackSize: 2880, // ~30 days
            zoneSize: 0.075,
            zoneMergeDistanceLimit: 0.05,
            scoreWeights: {
                volume_intensity: 3.5,
                liquidity_share: 6.5
            },
            stateLimit: 10,
            priceSnapshotsLimit: 5, // ~15 seconds worth
            supportEventDurationSeconds: 300,
            resistanceEventDurationSeconds: 300,
            keyzoneIdleOnEventMinutes: 90,
            eventScoreRequirement: 4.5
        }
    }
}