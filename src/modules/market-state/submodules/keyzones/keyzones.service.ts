import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../../../ioc";
import { IApiErrorService } from "../../../api-error";
import { ICandlestick, ICandlestickService } from "../../../candlestick";
import { INumberConfig, IUtilitiesService } from "../../../utilities";
import { ISplitStates } from "../_shared";
import { ILiquidityState, ILiquiditySideBuild } from "../liquidity";
import { 
    IKeyZone,
    IKeyZonesService, 
    IKeyZonesModel,
    IKeyZoneState,
    IKeyZoneFullState,
    IKeyZonePriceRange,
    IReversalType,
    IReversal,
    IMinifiedKeyZone,
    IKeyZoneVolumeIntensity,
    IKeyZoneStateEvent,
    IIdleKeyZones,
    IKeyZoneStateEventKind,
    IKeyZonesConfiguration,
    IKeyZonesValidations,
} from "./interfaces";




@injectable()
export class KeyZonesService implements IKeyZonesService {
    // Inject dependencies
    @inject(SYMBOLS.KeyZonesModel)                      private _model: IKeyZonesModel;
    @inject(SYMBOLS.KeyZonesValidations)                private _validations: IKeyZonesValidations;
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
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
                this._apiError.log("KeyZonesService.initialize.interval", e)
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
     * @param liquidityState? <- Must be provided unless calculating the full state
     * @returns IKeyZoneState|IKeyZoneFullState
     */
    public calculateState(
        windowSplitStates?: ISplitStates, 
        liquidityState?: ILiquidityState
    ): IKeyZoneState|IKeyZoneFullState {
        // Firstly, update the price
        this.updatePrice();

        // Check if the price is currently in a keyzone
        const active: IKeyZone|undefined = this.zones.filter(
            (z) => this.currentPrice >= z.s && this.currentPrice <= z.e
        )[0];

        // Check if the window & liquidity states have been provided
        if (windowSplitStates && liquidityState) {
            // Handle the state event
            const event: IKeyZoneStateEvent|null = this.buildStateEvent(windowSplitStates);

            // Init the state zones
            const { above, below } = this.getStateKeyZonesFromCurrentPrice();

            // Update the state and return it
            this.state = {
                event: event,
                active: active ? this.minifyKeyZone(active, 0, 0): null,
                above: this.buildStateKeyZones(above, liquidityState.a),
                below: this.buildStateKeyZones(below, liquidityState.b),
            }
            return <IKeyZoneState>this.state;
        }

        // Otherwise, calculate the full state
        else {
            return <IKeyZoneFullState>{
                active: active || null,
                above: this.getZonesFromPrice(this.currentPrice, true),
                below: this.getZonesFromPrice(this.currentPrice, false),
                price_snapshots: this.priceSnapshots,
                idle: this.idleKeyZones,
                build_ts: this.buildTS
            };
        }
    }






    /**
     * Retrieves all the state KeyZones and calculates their volume 
     * intensity.
     * @returns {above: IKeyZone[], below: IKeyZone[]}
     */
    private getStateKeyZonesFromCurrentPrice(): {above: IKeyZone[], below: IKeyZone[]} {
        // Init the zones
        let above: IKeyZone[] = this.getZonesFromPrice(
            this.currentPrice, 
            true, 
            this.config.stateLimit
        );
        let below: IKeyZone[] = this.getZonesFromPrice(
            this.currentPrice, 
            false, 
            this.config.stateLimit
        );

        // Calculate the volume requirements
        const { lowReq, mediumReq, highReq, veryHighReq } = this.calculateVolumeRequirements(
            above, 
            below
        );

        
        // Iterate over each KeyZone above and calculate the volume intensity
        for (let i = 0; i < above.length; i++) {
            above[i].vi = this.calculateVolumeIntensity(
                above[i].vm, 
                lowReq, 
                mediumReq, 
                highReq, 
                veryHighReq
            );
        }
        
        // Iterate over each KeyZone below and calculate the volume intensity
        for (let i = 0; i < below.length; i++) {
            below[i].vi = this.calculateVolumeIntensity(
                below[i].vm, 
                lowReq, 
                mediumReq, 
                highReq, 
                veryHighReq
            );
        }

        // Finally, return the build
        return { above: above, below: below };
    }






    /**
     * Calculates the volume requirements based on the trading volume that took place in
     * the KeyZones above and below.
     * @param zonesAbove 
     * @param zonesBelow 
     * @returns 
     */
    private calculateVolumeRequirements(
        zonesAbove: IKeyZone[],
        zonesBelow: IKeyZone[]
    ): {lowReq: number, mediumReq: number, highReq: number, veryHighReq: number} {
        // Iterate over each zone and calculate the required volume values
        let volSum: number = 0;
        let volLow: number = 0;
        let volHigh: number = 0;
        for (let zone of zonesAbove.concat(zonesBelow)) {
            volSum += zone.vm;
            volLow = volLow == 0 || zone.vm < volLow ? zone.vm: volLow;
            volHigh = zone.vm > volHigh ? zone.vm: volHigh;
        }

        // Calculate the requirements
        const volMean: number = volSum  / (zonesAbove.length + zonesBelow.length);
        const lowRequirement: number = 
            <number>this._utils.calculateAverage([volMean, volLow]);
        const mediumRequirement: number = 
            <number>this._utils.calculateAverage([volMean, lowRequirement]);
        const highRequirement: number = 
            <number>this._utils.calculateAverage([volMean, volHigh]);
        const veryHighRequirement: number = 
            <number>this._utils.calculateAverage([highRequirement, volHigh]);

        // Return the requirements
        return {
            lowReq: lowRequirement,
            mediumReq: mediumRequirement,
            highReq: highRequirement,
            veryHighReq: veryHighRequirement
        }
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
    private calculateVolumeIntensity(
        vol: number, 
        low: number, 
        medium: number, 
        high: number, 
        veryHigh: number
    ): IKeyZoneVolumeIntensity {
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
     * @param wSplitStates
     * @returns IKeyZoneStateEvent|null
     */
    private buildStateEvent(wSplitStates: ISplitStates): IKeyZoneStateEvent|null {
        // Initialize the event (if any)
        let evt: IKeyZoneStateEvent|null = this.state && this.state.event ? this.state.event: null;

        // If there is an event, ensure it is still active, otherwise, null it
        if (evt && !this.isEventActive(evt)) evt = null;

        // Look for an event if there are enough price snapshots
        if (this.priceSnapshots.length == this.config.priceSnapshotsLimit) {
            // Calculate the number of long splits that are increasing and decreasing strongly
            const increasingStronglyNum: number = 
                [wSplitStates.s100.s, wSplitStates.s75.s, wSplitStates.s50.s, wSplitStates.s25.s]
                .reduce(
                    (accumulator, currentValue) => currentValue == 2 ? accumulator + 1: accumulator,
                    0
                );
            const decreasingStronglyNum: number = 
                [wSplitStates.s100.s, wSplitStates.s75.s, wSplitStates.s50.s, wSplitStates.s25.s]
                .reduce(
                    (accumulator, currentValue) => currentValue == -2 ? accumulator + 1: accumulator,
                    0
                );

            /**
             * Support Event Requirements:
             * 1) There cannot be an active resistance event
             * 2) The initial price snapshot must be greater than the current (Decreased)
             * 3) The window split states for the 2% & 5% of the dataset must be decreasing
             * 4) The low & the close from the current 15-minute-interval candlestick must be lower than the previous one.
             * 5) There must be no long splits "Increasing Strongly".
             * 6) At least two of the long window states must be "Decreasing Strongly".
             */
            if (
                (!evt || evt.k != "r") &&
                this.priceSnapshots[0].o > this.priceSnapshots.at(-1).c &&
                wSplitStates.s5.s <= -1 &&
                wSplitStates.s2.s <= -1 &&
                this._candlestick.predictionLookback.at(-1).l < this._candlestick.predictionLookback.at(-2).l &&
                this._candlestick.predictionLookback.at(-1).c < this._candlestick.predictionLookback.at(-2).c &&
                increasingStronglyNum == 0 &&
                decreasingStronglyNum >= 2
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
                const active: IMinifiedKeyZone|undefined = this.state.below.filter(
                    (z) =>  (
                        (this.priceSnapshots.at(-1).c >= z.s && this.priceSnapshots.at(-1).c <= z.e) ||
                        (this.priceSnapshots.at(-1).l >= z.s && this.priceSnapshots.at(-1).l <= z.e)
                    ) &&
                    z.scr >= this.config.eventScoreRequirement &&
                    !this.isIdle(z.id) &&
                    z.s <= this._candlestick.predictionLookback.at(-1).l
                )[0];

                // If an event was found, set it
                if (active) evt = this.onKeyZoneEvent(active, "s");
            }

            /**
             * Resistance Event Requirements:
             * 1) There cannot be an active support event
             * 2) The initial price snapshot must be lower than the current(Increased)
             * 3) The window split states for the 2% & 5% of the dataset must be increasing
             * 4) The high & close from the current 15-minute-interval candlestick must be higher than the previous one.
             * 5) There must be no long splits "Decreasing Strongly".
             * 6) At least two of the long window states must be "Increasing Strongly".
             */
            else if (
                (!evt || evt.k != "s") &&
                this.priceSnapshots[0].o < this.priceSnapshots.at(-1).c &&
                wSplitStates.s5.s >= 1 &&
                wSplitStates.s2.s >= 1 &&
                this._candlestick.predictionLookback.at(-1).h > this._candlestick.predictionLookback.at(-2).h &&
                this._candlestick.predictionLookback.at(-1).c > this._candlestick.predictionLookback.at(-2).c &&
                decreasingStronglyNum == 0 &&
                increasingStronglyNum >= 2
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
                const active: IMinifiedKeyZone|undefined = this.state.above.filter(
                    (z) =>  (
                        (
                            this.priceSnapshots.at(-1).c >= z.s && 
                            this.priceSnapshots.at(-1).c <= z.e
                        ) ||
                        (
                            this.priceSnapshots.at(-1).h >= z.s && 
                            this.priceSnapshots.at(-1).h <= z.e
                        )
                    ) &&
                    z.scr >= this.config.eventScoreRequirement &&
                    !this.isIdle(z.id) &&
                    z.e >= this._candlestick.predictionLookback.at(-1).h
                )[0];

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

        // Calculate the price limit based on the kind of event
        let priceLimit: number;
        if (kind == "s") {
            priceLimit = <number>this._utils.alterNumberByPercentage(
                zone.e, 
                this.config.eventPriceDistanceLimit
            );
        } else {
            priceLimit = <number>this._utils.alterNumberByPercentage(
                zone.s, 
                -(this.config.eventPriceDistanceLimit)
            );
        }

        // Build the event
        const build: IKeyZoneStateEvent = {
            k: kind,
            kz: zone,
            t: Date.now(),
            e: moment().add(
                kind == "s" ? 
                    this.config.supportEventDurationMinutes: 
                    this.config.resistanceEventDurationMinutes, 
                "minutes"
            ).valueOf(),
            pl: priceLimit
        };

        // Store it in the db
        this._model.saveKeyZoneEvent(build);

        // Return the event's build
        return build;
    }




    /**
     * Checks if an event is still active based on its expiry time
     * as well as its price limit.
     * @param evt 
     * @returns boolean
     */
    private isEventActive(evt: IKeyZoneStateEvent): boolean { 
        return Date.now() <= evt.e &&
                (
                    (evt.k == "s" && this.currentPrice <= evt.pl) ||
                    (evt.k == "r" && this.currentPrice >= evt.pl)
                )
    }







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
        this.idleKeyZones[id] = moment().add(
            this.config.keyzoneIdleOnEventMinutes, "minutes"
        ).valueOf();
    }

















    /* State KeyZones Build */




    /**
     * Builds the KeyZone object that is used by the state. Apart from inserting
     * all essential info, it also inserts the liquidity share and the score.
     * @param zones 
     * @param sideLiquidity 
     * @returns IMinifiedKeyZone[]
     */
    private buildStateKeyZones(
        zones: IKeyZone[], 
        sideLiquidity: ILiquiditySideBuild
    ): IMinifiedKeyZone[] {
        // Init the list of zones
        let finalZones: IMinifiedKeyZone[] = [];

        // Iterate over each zone
        for (let zone of zones) {
            // Init the range that will be used to calculate the accumulated liquidity
            const start: number = Math.floor(zone.s - 1);
            const end: number = Math.ceil(zone.e + 1);

            // Calculate the accum liquidity
            const accumulatedLiquidity: number = sideLiquidity.l.reduce(
                (a, b) => a + (b.p >= start && b.p <= end ? b.l: 0), 
                0
            );

            // Calculate the liquidity share
            const liquidityShare: number = <number>this._utils.calculatePercentageOutOfTotal(
                accumulatedLiquidity, 
                sideLiquidity.t
            );

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
        let score: number = 0.40;

        // Set the score accordingly
        if      (volIntensity == 4) { score = 1 }
        else if (volIntensity == 3) { score = 0.85 }
        else if (volIntensity == 2) { score = 0.70  }
        else if (volIntensity == 1) { score = 0.55 }

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
        if      (liquidityShare >= 12)      { score = 1 }
        else if (liquidityShare >= 11.5)    { score = 0.99 }
        else if (liquidityShare >= 11)      { score = 0.98 }
        else if (liquidityShare >= 10.5)    { score = 0.97 }
        else if (liquidityShare >= 10)      { score = 0.96 }
        else if (liquidityShare >= 9.5)     { score = 0.95 }
        else if (liquidityShare >= 9)       { score = 0.94 }
        else if (liquidityShare >= 8.5)     { score = 0.93 }
        else if (liquidityShare >= 8)       { score = 0.92 }
        else if (liquidityShare >= 7.5)     { score = 0.91 }
        else if (liquidityShare >= 7)       { score = 0.90 }
        else if (liquidityShare >= 6.5)     { score = 0.87 }
        else if (liquidityShare >= 6)       { score = 0.84 }
        else if (liquidityShare >= 5.5)     { score = 0.81 }
        else if (liquidityShare >= 5)       { score = 0.78 }
        else if (liquidityShare >= 4.5)     { score = 0.75 }
        else if (liquidityShare >= 4)       { score = 0.72 }
        else if (liquidityShare >= 3.5)     { score = 0.69 }
        else if (liquidityShare >= 3)       { score = 0.66 }
        else if (liquidityShare >= 2.5)     { score = 0.63 }
        else if (liquidityShare >= 2)       { score = 0.60 }
        else if (liquidityShare >= 1.5)     { score = 0.57 }
        else if (liquidityShare >= 1)       { score = 0.54 }
        else if (liquidityShare >= 0.75)    { score = 0.49 }
        else if (liquidityShare >= 0.4)     { score = 0.44 }
        else if (liquidityShare >= 0.2)     { score = 0.35 }

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
        let zones: IKeyZone[] = this.zones.filter(
            (z) => (above && z.s > price) || (!above && z.e < price)
        );

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
    public getDefaultState(): IKeyZoneState { 
        return { event: null, active: null, above: [], below: [] };
    }
    











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
















    /************************************
     * KeyZones Event Record Management *
     ************************************/






    /**
     * Retrieves the list of KeyZones Events by a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IKeyZoneStateEvent[]>
     */
    public async listKeyZoneEvents(startAt: number, endAt: number): Promise<IKeyZoneStateEvent[]> {
        // Validate the request
        this._validations.canKeyZoneEventsBeListed(startAt, endAt);

        // Return the list of events
        return await this._model.listKeyZoneEvents(startAt, endAt);
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
        const candlesticks: ICandlestick[] = 
            this._candlestick.predictionLookback.slice(-this.config.buildLookbackSize);

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
     * it will clear the temporary zones and update the final ones.
     * Keep in mind this process will be executed twice to make sure there 
     * are no overlapping zones.
     * @param secondMergeRound?
     */
    private mergeNearbyTempZones(secondMergeRound?: boolean): void {
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

        // If it is the first round, update the temp zones and run it again
        if (!secondMergeRound) {
            this.tempZones = finalZones.slice();
            this.mergeNearbyTempZones(true);
        }

        // Otherwise, clean the temp zones and assign them to the final list
        else {
            this.tempZones = [];
            this.zones = finalZones;
        }
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
            this.tempZones[zoneIndex].r.push({ 
                id: candlestick.ot, 
                t: reversalType, 
                v: candlestick.v 
            });

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
    private calculatePriceRange(
        candlestick: ICandlestick, 
        reversalType: IReversalType
    ): IKeyZonePriceRange {
        // Check if it was a resistance
        if (reversalType == "r") {
            return {
                s: <number>this._utils.alterNumberByPercentage(
                    candlestick.h, 
                    -(this.config.zoneSize), 
                    this.numberConfig
                ),
                e: candlestick.h
            }
        }

        // Otherwise, it is a support
        else {
            return {
                s: candlestick.l,
                e: <number>this._utils.alterNumberByPercentage(
                    candlestick.l, 
                    this.config.zoneSize, 
                    this.numberConfig
                )
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
        const config: IKeyZonesConfiguration|undefined = await this._model.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this._model.createConfigurationRecord(this.config);
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
        this._validations.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this._model.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;

        // Update the build
        this.updateBuild();
    }






    /**
     * Builds the default KeyZones Configuration object in order
     * of the db record to be initialized.
     * @returns IKeyZonesConfiguration
     */
    private buildDefaultConfig(): IKeyZonesConfiguration {
        return {
            buildFrequencyHours: 8,
            buildLookbackSize: 10000, // ~104.16 days (15m interval)
            zoneSize: 0.065,
            zoneMergeDistanceLimit: 0.025,
            scoreWeights: {
                volume_intensity: 5,
                liquidity_share: 5
            },
            stateLimit: 10,
            priceSnapshotsLimit: 5, // ~15 seconds worth
            supportEventDurationMinutes: 60,      // ~1 hour
            resistanceEventDurationMinutes: 60,   // ~1 hour
            eventPriceDistanceLimit: 3,
            keyzoneIdleOnEventMinutes: 30,
            eventScoreRequirement: 5
        }
    }
}