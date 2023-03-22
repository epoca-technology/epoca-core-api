import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { INumberConfig, IUtilitiesService } from "../utilities";
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
    IKeyZoneScoreWeights,
    IIdleKeyZones,
    IKeyZoneStateEventKind,
    ISplitStates
} from "./interfaces";




@injectable()
export class KeyZonesStateService implements IKeyZonesStateService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.LiquidityService)                   private _liquidity: ILiquidityStateService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * The configuration that will be used in order to output numbers.
     */
    private readonly numberConfig: INumberConfig = { dp: 0, ru: true };



    /**
     * Build Lookback Size
     * The number of 15-minute-interval candlesticks that will be used to build
     * the KeyZones.
     */
    private readonly buildLookbackSize: number = 2880; // ~30 days



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
     * Zone Size
     * The zone's size percentage. The start and end prices are based on this value.
     */
    private readonly zoneSize: number = 0.1;



    /**
     * Merge Distance
     * Once all zones have been set and ordered by price, it will merge the ones that 
     * are close to one another.
     */
    private readonly zoneMergeDistanceLimit: number = 0.05;




    /**
     * State Limit
     * Limits the number of zones returned from the current price. For example, 
     * if 2 is provided, it retrieves 4 zones in total (2 above and 2 below)
     */
    private readonly stateLimit: number = 10;




    /**
     * Volume Mean
     * Once the KeyZones are built, the mean of the volumes is calculated and
     * stored in order to be able to derive the intensity.
     */
    private volumeMean: number = 0;
    private volumeMeanLow: number = 0;
    private volumeMeanMedium: number = 0;
    private volumeMeanHigh: number = 0;


    /**
     * Score Weights
     * The object containing the weights that will be used to calculate a 
     * KeyZone's Score. The score should be limitted to a number from 0 to 10.
     */
    private readonly scoreWeights: IKeyZoneScoreWeights = {
        volume_intensity: 6.5,
        liquidity_share: 3.5
    }


    /**
     * Price
     * Every time the state is calculated, the current price and the snapshots
     * are updated.
     */
    private currentPrice: number;
    private priceSnapshots: ICandlestick[] = [];
    private priceSnapshotsLimit: number = 5; // ~15 seconds worth


    /**
     * Event
     * When the price is increasing or decreasing and hits a KeyZone that isn't idle
     * and which score is greater than or equals to eventScoreRequirement, an event
     * is created and emmited. This event lasts for eventDurationSeconds and 
     * sets the KeyZone on idle state for keyzoneIdleOnEventMinutes.
     * Keep in mind the KeyZone score is a float ranging from 0 to 10.
     */
    private idleKeyZones: IIdleKeyZones = {}; // ID: Idle Until Timestamp
    private readonly eventDurationSeconds: number = 30;
    private readonly keyzoneIdleOnEventMinutes: number = 120;
    private readonly eventScoreRequirement: number = 5;


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
    private readonly intervalSeconds: number = 60 * 360; // ~6 hours
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
        // Build the KeyZones and initialize the interval
        this.updateBuild();
        this.buildInterval = setInterval(async () => {
            try { this.updateBuild() } 
            catch (e) { 
                console.error(e);
                this._apiError.log("KeyZonesState.initialize.interval", e)
            }
        }, this.intervalSeconds * 1000);
    }





    /**
     * Stops the build interval.
     */
    public stop(): void {
        if (this.buildInterval) clearInterval(this.buildInterval);
        this.buildInterval = undefined;
        this.idleKeyZones = {};
        this.volumeMean = 0;
        this.volumeMeanLow = 0;
        this.volumeMeanMedium = 0;
        this.volumeMeanHigh = 0;
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
                volume_mean: this.volumeMean,
                volume_mean_low: this.volumeMeanLow,
                volume_mean_medium: this.volumeMeanMedium,
                volume_mean_high: this.volumeMeanHigh,
                build_ts: this.buildTS
            };
        } 
        
        // Otherwise, calculate the active state
        else {
            // Handle the state event
            const event: IKeyZoneStateEvent|null = this.buildStateEvent(windowSplitStates);

            // Init the state zones
            const above: IKeyZone[] = this.getZonesFromPrice(this.currentPrice, true, this.stateLimit);
            const below: IKeyZone[] = this.getZonesFromPrice(this.currentPrice, false, this.stateLimit);

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
        if (this.priceSnapshots.length == this.priceSnapshotsLimit) {
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
                windowSplitStates.s5.s <= -1 &&
                windowSplitStates.s2.s <= -1 &&
                this._candlestick.predictionLookback.at(-1).l < this._candlestick.predictionLookback.at(-2).l &&
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
                 */
                const activeZones: IMinifiedKeyZone[] = this.state.below.filter(
                    (z) =>  (
                        (this.priceSnapshots.at(-1).c >= z.s && this.priceSnapshots.at(-1).c <= z.e) ||
                        (this.priceSnapshots.at(-1).l >= z.s && this.priceSnapshots.at(-1).l <= z.e)
                        /*(
                            this.priceSnapshots.at(-1).l >= z.s && this.priceSnapshots.at(-1).l <= z.e && 
                            this.priceSnapshots.at(-1).l < this.priceSnapshots.at(-2).l
                        )*/
                    ) &&
                    z.scr >= this.eventScoreRequirement &&
                    !this.isIdle(z.id)
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
                windowSplitStates.s5.s >= 1 &&
                windowSplitStates.s2.s >= 1 &&
                this._candlestick.predictionLookback.at(-1).h > this._candlestick.predictionLookback.at(-2).h &&
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
                 */
                let activeZones: IMinifiedKeyZone[] = this.state.above.filter(
                    (z) =>  (
                        (this.priceSnapshots.at(-1).c >= z.s && this.priceSnapshots.at(-1).c <= z.e) ||
                        (this.priceSnapshots.at(-1).h >= z.s && this.priceSnapshots.at(-1).h <= z.e)
                        /*(
                            this.priceSnapshots.at(-1).h >= z.s && this.priceSnapshots.at(-1).h <= z.e && 
                            this.priceSnapshots.at(-1).h > this.priceSnapshots.at(-2).h
                        )*/
                    ) &&
                    z.scr >= this.eventScoreRequirement &&
                    !this.isIdle(z.id)
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
        // Activate the idle on the zone
        this.activateIdle(zone.id);

        // Return the event's build
        return {
            k: kind,
            kz: zone,
            e: moment().add(this.eventDurationSeconds, "seconds").valueOf()
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
        this.idleKeyZones[id] = moment().add(this.keyzoneIdleOnEventMinutes, "minutes").valueOf();
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
        else if (volIntensity == 2) { score = 0.66 }
        else if (volIntensity == 1) { score = 0.5 }

        // Finally, return the local score multiplied by the weights
        return this.scoreWeights.volume_intensity * score;
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
        if      (liquidityShare >= 20)   { score = 1 }
        else if (liquidityShare >= 19)   { score = 0.97 }
        else if (liquidityShare >= 18)   { score = 0.94 }
        else if (liquidityShare >= 17)   { score = 0.91 }
        else if (liquidityShare >= 16)   { score = 0.88 }
        else if (liquidityShare >= 15)   { score = 0.85 }
        else if (liquidityShare >= 14)   { score = 0.82 }
        else if (liquidityShare >= 13)   { score = 0.79 }
        else if (liquidityShare >= 12)   { score = 0.76 }
        else if (liquidityShare >= 11)   { score = 0.73 }
        else if (liquidityShare >= 10)   { score = 0.70 }
        else if (liquidityShare >= 9)    { score = 0.67 }
        else if (liquidityShare >= 8)    { score = 0.64 }
        else if (liquidityShare >= 7)    { score = 0.61 }
        else if (liquidityShare >= 6)    { score = 0.58 }
        else if (liquidityShare >= 5)    { score = 0.55 }
        else if (liquidityShare >= 4)    { score = 0.52 }
        else if (liquidityShare >= 3)    { score = 0.49 }
        else if (liquidityShare >= 2)    { score = 0.46 }
        else if (liquidityShare >= 1)    { score = 0.43 }
        else if (liquidityShare >= 0.5)  { score = 0.40 }
        else if (liquidityShare >= 0.25) { score = 0.35 }

        // Finally, return the local score multiplied by the weights
        return this.scoreWeights.liquidity_share * score;
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
        if (this.priceSnapshots.length > this.priceSnapshotsLimit) {
            this.priceSnapshots = this.priceSnapshots.slice(-this.priceSnapshotsLimit);
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
        const candlesticks: ICandlestick[] = this._candlestick.predictionLookback.slice(-this.buildLookbackSize);

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

        // Calculate the KeyZone Volumes
        this.calculateKeyZoneVolumes();

        // Reset the idle object
        this.idleKeyZones = {};

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
                    if (change <= this.zoneMergeDistanceLimit) {
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
                s: <number>this._utils.alterNumberByPercentage(candlestick.h, -(this.zoneSize), this.numberConfig),
                e: candlestick.h
            }
        }

        // Otherwise, it is a support
        else {
            return {
                s: candlestick.l,
                e: <number>this._utils.alterNumberByPercentage(candlestick.l, this.zoneSize, this.numberConfig)
            }
        }
    }






    /**
     * Once the KeyZones have been built and merged, the mean of the volumes 
     * are calculated and an intensity (0|1|2) is assigned to each zone.
     */
    private calculateKeyZoneVolumes(): void {
        if (this.zones.length > 0) {
            // Init values
            let volMeanAccum: number = 0;
            let volMeanLowest: number = 0;
            let volMeanHighest: number = 0;

            // Iterate over each zone
            for (let i = 0; i < this.zones.length; i++) {
                // Calculate the mean of all the reversals within
                const volMean: number = <number>this._utils.calculateAverage(this.zones[i].r.map(r => r.v));

                // Add the mean to the accumulator
                volMeanAccum += volMean;

                // Check if it is the lowest mean so far
                volMeanLowest = volMeanLowest == 0 || volMean < volMeanLowest ? volMean: volMeanLowest;

                // Check if it is the highest mean so far
                volMeanHighest = volMean > volMeanHighest ? volMean: volMeanHighest;

                // Insert the volume mean into the zone
                this.zones[i].vm = volMean;
            }

            // Calculate the global mean and the intensity requirements
            this.volumeMean = <number>this._utils.outputNumber(volMeanAccum / this.zones.length);
            this.volumeMeanLow = <number>this._utils.calculateAverage([this.volumeMean, volMeanLowest]);
            this.volumeMeanHigh = <number>this._utils.calculateAverage([this.volumeMean, volMeanHighest]);
            this.volumeMeanMedium = <number>this._utils.calculateAverage([this.volumeMean, this.volumeMeanHigh]);

            // Iterate over the zones once more
            for (let i = 0; i < this.zones.length; i++) {
                // Calculate the intensity of the zone
                let intensity: IKeyZoneVolumeIntensity = 0;
                if      (this.zones[i].vm >= this.volumeMeanHigh)   { intensity = 4 }
                else if (this.zones[i].vm >= this.volumeMeanMedium) { intensity = 3 }
                else if (this.zones[i].vm >= this.volumeMean)       { intensity = 2 }
                else if (this.zones[i].vm >= this.volumeMeanLow)    { intensity = 1 }

                // Insert the intensity into the keyzone
                this.zones[i].vi = intensity;
            }
        }
    }
}