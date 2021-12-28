import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IUtilitiesService } from "../shared/utilities";
import { 
    IKeyZonesService, 
    IKeyZonesConfig, 
    IKeyZonesState,
    IKeyZone,
    IReversalType,
    IKeyZonePriceRange,
} from "./interfaces";



@injectable()
export class KeyZonesService implements IKeyZonesService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;




    /**
     * @zones
     * All zones are stored temporarily until the actual key zones are extracted.
     */
    private zones: IKeyZone[] = [];



    /**
     * @zoneSize
     * The zone's size percentage. The start and end prices are based on this value.
     */
    private readonly zoneSize: number = 0.5;



    /**
     * @reversalCountRequirement
     * The number of times a reverse needs to happen within a zone in order to be 
     * considered a key zone.
     */
    private readonly reversalCountRequirement: number = 2;



    /**
     * @verbose
     * Displays information based on the number set for debugging purposes
     */
    private readonly verbose: number = 0;




    constructor() {}






    /**
     * Given a series of candlesticks, it will build the current state to aid decision making.
     * @param candlesticks
     * @param config?
     * @returns IKeyZonesState
     */
    public getState(candlesticks: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState {
        // Make sure a minimum of 10 candlesticks have been provided
        if (!candlesticks || candlesticks.length < 10) {
            console.log(candlesticks);
            throw new Error('A minimum of 10 candlesticks are required in order to retrieve the key zones state.');
        }

        // Init the config
        config = this.getConfig(config);

        // Init the state
        let state: IKeyZonesState = this.getInitialState(candlesticks.at(-1));

        // Retrieve the key zones
        state.zones = this.getKeyZones(candlesticks, config);

        // Return the final state
        return state;
    }



    











    /* Key zones */




    /**
     * Retrieves a list of all the zones in which there were reversals
     * ordered by the date in which they were first found.
     * @param candlesticks
     * @param config
     * @returns IKeyZone[]
     */
    private getKeyZones(candlesticks: ICandlestick[], config: IKeyZonesConfig): IKeyZone[] {
        // Init temp data
        this.zones = [];

        /**
         * Iterate over each candlestick scanning for reversals.
         * The loop starts on the fifth item and ends on the fifth to last item as 
         * for a reversal to be detected it needs:
         * Resistance:  Higher than the previous 4 and next 4 candlesticks
         * Support:  Lower than the previous 4 and next 4 candlesticks
         */
        for (let i = 4; i < candlesticks.length - 4; i++) {
            // Check if a resistance reversal has occurred
            if (
                candlesticks[i].h > candlesticks[i - 4].h &&
                candlesticks[i].h > candlesticks[i - 3].h &&
                candlesticks[i].h > candlesticks[i - 2].h &&
                candlesticks[i].h > candlesticks[i - 1].h &&
                candlesticks[i].h > candlesticks[i + 1].h &&
                candlesticks[i].h > candlesticks[i + 2].h &&
                candlesticks[i].h > candlesticks[i + 3].h &&
                candlesticks[i].h > candlesticks[i + 4].h
            ) { this.onReversal(candlesticks[i], 'resistance', config.zoneSize) }

            // Check if a support reversal has occurred
            else if (
                candlesticks[i].l < candlesticks[i - 4].l &&
                candlesticks[i].l < candlesticks[i - 3].l &&
                candlesticks[i].l < candlesticks[i - 2].l &&
                candlesticks[i].l < candlesticks[i - 1].l &&
                candlesticks[i].l < candlesticks[i + 1].l &&
                candlesticks[i].l < candlesticks[i + 2].l &&
                candlesticks[i].l < candlesticks[i + 3].l &&
                candlesticks[i].l < candlesticks[i + 4].l
            ) { this.onReversal(candlesticks[i], 'support', config.zoneSize) }
        }

        // Build the key zones
        const keyZones: IKeyZone[] = this.selectKeyZones(config.reversalCountRequirement);

        // Clear temp data
        this.zones = [];

        // Return the key zones only
        return keyZones;
    }







    /**
     * Triggers when a reversal has been identified. 
     * @param candlestick 
     * @param rType 
     * @param zoneSize 
     * @returns void
     */
    private onReversal(candlestick: ICandlestick, rType: IReversalType, zoneSize: number): void {
        // Calculate the price range
        const range: IKeyZonePriceRange = this.getZonePriceRange(candlestick, rType, zoneSize);

        // Check if the reversal matches a previous zone
        const zoneIndex: number|undefined = this.isInZone(range);

        // The price range matches an existing zone
        if (typeof zoneIndex == "number") {
            // Increment the reversal count
            this.zones[zoneIndex].reversalCount += 1;

            // Check if there has been a mutation
            if (rType != this.zones[zoneIndex].reversalType) this.zones[zoneIndex].reversalType = 'mutated';
        }

        // No zones matched the price range
        else {
            this.zones.push({
                id: candlestick.ot,
                start: range.start,
                end: range.end,
                reversalCount: 1,
                reversalType: rType
            });
        }
    }








    /**
     * Checks if the current reversal marches a previous reversal. If so,
     * it will return the index of the zone. Otherwise it will return 
     * undefined.
     * @param r
     * @returns number|undefined
     */
    private isInZone(r: IKeyZonePriceRange): number|undefined {
        // Iterate over each zone looking for a match
        for (let i = 0; i < this.zones.length; i++) {
            if (
                (r.start >= this.zones[i].start && r.start <= this.zones[i].end) ||
                (r.end <= this.zones[i].end && r.end >= this.zones[i].start)
            ) {
                // A matching zone has been found
                return i;
            }
        }
    
        // If no matches are found, return undefined
        return undefined;
    }









    /**
     * Retrieves the start and the end of a zone based on the provided params.
     * @param candlestick 
     * @param rType 
     * @param zoneSize 
     * @returns IKeyZonePriceRange
     */
     private getZonePriceRange(candlestick: ICandlestick, rType: IReversalType, zoneSize: number): IKeyZonePriceRange {
        if (rType == 'resistance') {
            return {
                start: <number>this._utils.alterNumberByPercentage(candlestick.h, -(zoneSize)),
                end: candlestick.h
            }
        } else {
            return {
                start: candlestick.l,
                end: <number>this._utils.alterNumberByPercentage(candlestick.l, zoneSize)
            }
        }
    }







    /**
     * Selects the key zones from all the zones stored in temp memory based 
     * on the reversal count requirement.
     * @param reversalCountRequirement 
     * @returns IKeyZone[]
     */
    private selectKeyZones(reversalCountRequirement: number): IKeyZone[] {
        // Init the key zones
        let keyZones: IKeyZone[] = [];

        // Iterate over each zone and add the ones that meet the requirements
        this.zones.forEach((z) => { if (z.reversalCount >= reversalCountRequirement) keyZones.push(z) });

        // Sort the zones by start price ascending (low to high)
        keyZones.sort((a, b) => { return a.start - b.start });

        // Return the final key zones
        return keyZones;
    }



















    /* Misc Helpers */








    /**
     * Given a config object, it will retrieve the final config values.
     * @param config 
     * @returns IForecastConfig
     */
    private getConfig(config?: IKeyZonesConfig): IKeyZonesConfig {
        config = config ? config: {};
        return {
            zoneSize: typeof config.zoneSize == "number" ? config.zoneSize: this.zoneSize,
            reversalCountRequirement: typeof config.reversalCountRequirement == "number" ? config.reversalCountRequirement: this.reversalCountRequirement,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }









    
    /**
     * Given the last candlestick, it will build the initial state.
     * @param last 
     * @returns IKeyZonesState
     */
    private getInitialState(last: ICandlestick): IKeyZonesState {
        return {
            price: last.c,
            takerBuyVolumePercent: <number>this._utils.calculatePercentageOutOfTotal(last.tbv, last.v, {ru: true, dp: 0}),
            zones: [],
            zonesAbove: [],
            zonesBelow: [],
            touchedResistance: false,
            brokeResistance: false,
            touchedSupport: false,
            brokeSupport: false
        }
    }




    

}