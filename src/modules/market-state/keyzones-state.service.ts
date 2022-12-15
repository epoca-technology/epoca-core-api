import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceCandlestick, IBinanceService } from "../binance";
import { INumberConfig, IUtilitiesService } from "../utilities";
import { 
    IKeyZone,
    IKeyZonesStateService, 
    IKeyZoneState,
    IKeyZoneCandlestick,
    IKeyZonePriceRange,
    IReversalType,
    IReversal,
} from "./interfaces";




@injectable()
export class KeyZonesStateService implements IKeyZonesStateService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * The configuration that will be used in order to output numbers.
     */
    private readonly numberConfig: INumberConfig = { dp: 0, ru: true };

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
    private readonly zoneSize: number = 3;

    /**
     * Merge Distance
     * Once all zones have been set and ordered by price, it will merge the ones that 
     * are close to one another.
     */
    private readonly zoneMergeDistanceLimit: number = 1;

    /**
     * State Limit
     * Limits the number of zones returned from the current price. For example, 
     * if 2 is provided, it retrieves 4 zones in total (2 above and 2 below)
     */
    private readonly stateLimit: number = 8;


    /**
     * KeyZones Build Interval
     * Every intervalSeconds, the keyzones will be built based on the latest data.
     */
    private buildInterval: any;
    private readonly intervalSeconds: number = 60 * 120; // ~2 hours
    private buildTS: number = 0;


    constructor() {}










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
        await this.updateBuild();
        this.buildInterval = setInterval(async () => {
            try { await this.updateBuild() } 
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
    }






    


    /**************
     * Retrievers *
     **************/




    /**
     * Calculates the state based on the current price.
     * @param price 
     * @returns IKeyZoneState
     */
    public calculateState(price: number): IKeyZoneState {
        // Check if the price is currently in a keyzone
        const active: IKeyZone[] = this.zones.filter((z) => price >= z.s && price <= z.e);

        // Finally, return the state
        return {
            active: active[0],
            above: this.getZonesFromPrice(price, true),
            below: this.getZonesFromPrice(price, false),
            ts: Date.now(),
            build_ts: this.buildTS
        };
    }





    /**
     * Retrieves all the keyzones below or above from the current price.
     * @param price 
     * @param above 
     * @returns IKeyZone[]
     */
     public getZonesFromPrice(price: number, above: boolean): IKeyZone[] {
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
        return zones.slice(0, this.stateLimit);
    }

    



    /**
     * Retrieves the module's default state.
     * @returns IKeyZoneState
     */
     public getDefaultState(): IKeyZoneState {
        return {
            active: undefined,
            above: [],
            below: [],
            ts: Date.now(),
            build_ts: this.buildTS
        }
    }







    /*********
     * Build *
     *********/






    /**
     * Retrieves the last 1.000 daily candlesticks
     * and calculates all the keyzones.
     * @returns Promise<void>
     */
    private async updateBuild(): Promise<void> {
        // Retrieve the candlesticks
        const candlesticks: IKeyZoneCandlestick[] = await this.getKeyZoneCandlesticks();

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
    private onReversal(candlestick: IKeyZoneCandlestick, reversalType: IReversalType): void {
        // Firstly, calculate the price range
        const range: IKeyZonePriceRange = this.calculatePriceRange(candlestick, reversalType);

        // Check if the reversal took place in an existing zone
        const zoneIndex: number|undefined = this.reversedInZone(range);

        // If an index was found, update the zone with the new data
        if (typeof zoneIndex == "number") {
            // Add the new reversal
            this.tempZones[zoneIndex].r.push({ id: candlestick.ot, t: reversalType });

            // Update the mutated state
            this.tempZones[zoneIndex].m = this.zoneMutated(this.tempZones[zoneIndex].r);
        }

        // The reversal took place in a new area, add it to the zones
        else {
            this.tempZones.push({
                id: candlestick.ot,
                s: range.s,
                e: range.e,
                r: [ {id: candlestick.ot, t: reversalType } ],
                m: false
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
            m: this.zoneMutated(reversals)
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
    private calculatePriceRange(candlestick: IKeyZoneCandlestick, reversalType: IReversalType): IKeyZonePriceRange {
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







    /**************************
     * Candlestick Retrievers *
     **************************/


    /**
     * Retrieves the raw candlesticks from Binance's API and then 
     * processes them.
     * @returns Promise<IKeyZoneCandlestick[]>
     */
    private async getKeyZoneCandlesticks(): Promise<IKeyZoneCandlestick[]> {
        // Retrieve the raw candlesticks
        const raw: IBinanceCandlestick[] = await this.getRawCandlesticks();

        // Build the KeyZone Candlesticks
        return raw.map((rc) => {
            return {
                ot: rc[0],
                h: <number>this._utils.outputNumber(rc[2], this.numberConfig),
                l: <number>this._utils.outputNumber(rc[3], this.numberConfig),
            }
        });
    }



    /**
     * Retrieves the raw daily candlesticks from binance's api.
     * @returns Promise<IBinanceCandlestick[]>
     */
    private async getRawCandlesticks(): Promise<IBinanceCandlestick[]> {
        try { return await this._binance.getCandlesticks("1d") }
        catch (e) {
            console.error("1) Error when retrieving the daily candlesticks from Binance. Attempting again in a few seconds...", e);
            await this._utils.asyncDelay(3);
            try { return await this._binance.getCandlesticks("1d") }
            catch (e) {
                console.error("2) Error when retrieving the daily candlesticks from Binance. Attempting again in a few seconds...", e);
                await this._utils.asyncDelay(5);
                try { return await this._binance.getCandlesticks("1d") }
                catch (e) {
                    console.error("3) Error when retrieving the daily candlesticks from Binance. Attempting again in a few seconds...", e);
                    await this._utils.asyncDelay(5);
                    return await this._binance.getCandlesticks("1d")
                }
            }
        }
    }
}