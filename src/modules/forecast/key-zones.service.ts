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
    IReversal,
    IKeyZonesData,
    IPriceAction,
    IPriceActionData,
    IKeyZonePriceAction
} from "./interfaces";
import {BigNumber} from "bignumber.js";



@injectable()
export class KeyZonesService implements IKeyZonesService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;




    /**
     * @zones
     * All zones are stored temporarily until the actual key zones are extracted. 
     * They are initially ordered by date ascending. Once the selectKeyZones function
     * is called, they order by price ascending.
     */
    private zones: IKeyZone[] = [];



    /**
     * @zoneSize
     * The zone's size percentage. The start and end prices are based on this value.
     */
    private readonly zoneSize: number = 0.6;



    /**
     * @zoneMergeDistanceLimit
     * Once all zones have been set and ordered by price, it will merge the ones that are 
     * close to one another.
     */
     private readonly zoneMergeDistanceLimit: number = 1.5;



    /**
     * @verbose
     * Displays information based on the number set for debugging purposes
     */
    private readonly verbose: number = 0;




    constructor() {}






    /**
     * Given a series of candlesticks, it will build the current state to aid decision making.
     * @param candlesticks
     * @param candlesticks1m
     * @param config?
     * @returns IKeyZonesState
     */
    public getState(candlesticks: ICandlestick[], candlesticks1m: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState {
        // Make sure a minimum of 10 candlesticks have been provided
        if (!candlesticks || candlesticks.length < 10) {
            console.log(candlesticks);
            throw new Error('A minimum of 10 candlesticks are required in order to retrieve the key zones state.');
        }

        // Init the config
        config = this.getConfig(config);

        // Init the last candlestick
        const lastCandlestick: ICandlestick = candlesticks.at(-1);

        // Init the state
        let state: IKeyZonesState = this.getInitialState(lastCandlestick.c);

        // Retrieve the Key Zones Data
        const {keyZones, actions} = this.getKeyZonesData(candlesticks, candlesticks1m, config);

        // Key Zones
        state.zones = keyZones;
        state.zonesAbove = this.getZonesFromPrice(state.price, keyZones, true);
        state.zonesBelow = this.getZonesFromPrice(state.price, keyZones, false);

        // Resistance Dominance
        state.resistanceDominance = <number>this._utils.calculatePercentageOutOfTotal(state.zonesAbove.length, keyZones.length, {ru: true, dp: 0});

        // Support Dominance
        state.supportDominance = <number>this._utils.calculatePercentageOutOfTotal(state.zonesBelow.length, keyZones.length, {ru: true, dp: 0});

        // Actions
        state.actions = actions;

        // Check if an action took place.
        const action: IPriceAction = actions.at(-1);
        state.touchedSupport = action.type == 'touched-support' && action.id == lastCandlestick.ct;
        state.brokeSupport = action.type == 'broke-support' && action.id == lastCandlestick.ct;
        state.touchedResistance = action.type == 'touched-resistance' && action.id == lastCandlestick.ct;
        state.brokeResistance = action.type == 'broke-resistance' && action.id == lastCandlestick.ct;

        // Return the final state
        return state;
    }



    











    /* Key Zones Detection */




    /**
     * Retrieves a list of all the zones in which there were reversals
     * ordered by the date in which they were first found.
     * @param candlesticks
     * @param candlesticks1m
     * @param config
     * @returns IKeyZonesData
     */
    private getKeyZonesData(candlesticks: ICandlestick[], candlesticks1m: ICandlestick[], config: IKeyZonesConfig): IKeyZonesData {
        // Init temp data
        this.zones = [];

        /**
         * Iterate over each candlestick scanning for reversals.
         * The loop starts on the fifth item and ends on the fifth to last item as 
         * for a reversal to be detected it needs:
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
            ) { this.onReversal(candlesticks[i], 'resistance', config.zoneSize) }

            // Check if a support reversal has occurred
            else if (
                candlesticks[i].l < candlesticks[i - 3].l &&
                candlesticks[i].l < candlesticks[i - 2].l &&
                candlesticks[i].l < candlesticks[i - 1].l &&
                candlesticks[i].l < candlesticks[i + 1].l &&
                candlesticks[i].l < candlesticks[i + 2].l &&
                candlesticks[i].l < candlesticks[i + 3].l
            ) { this.onReversal(candlesticks[i], 'support', config.zoneSize) }
        }

        // Build the key zones
        const data: IKeyZonesData = this.selectKeyZones(config.zoneMergeDistanceLimit, candlesticks1m);

        // Clear temp data
        this.zones = [];

        // Return the key zones and actions
        return data;
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
        const zoneIndex: number|undefined = this.reversedInExistingZone(range);
        
        // The price range matches an existing zone
        if (typeof zoneIndex == "number") {
            // Add the new reversal
            this.zones[zoneIndex].reversals.push({id: candlestick.ot, type: rType});

            // Add the volume
            this.zones[zoneIndex].volume = 
                <number>this._utils.outputNumber(new BigNumber(this.zones[zoneIndex].volume).plus(candlestick.v));

            // Check if there has been a mutation
            this.zones[zoneIndex].mutated = this.zoneMutated(this.zones[zoneIndex].reversals);
        }

        // No zones matched the price range, add the zone
        else {
            this.zones.push({
                id: candlestick.ot,
                start: range.start,
                end: range.end,
                reversals: [{id: candlestick.ot, type: rType}],
                volume: candlestick.v,
                volumeScore: 0, // Will be populated afterwards
                mutated: false,
                action: {touched: 0, broke: 0}
            });
        }
    }








    /**
     * Checks if the current reversal marches a previous reversal. If so,
     * it will return the index of the zone. Otherwise it will return 
     * undefined.
     * @param range
     * @returns number|undefined
     */
    private reversedInExistingZone(range: IKeyZonePriceRange): number|undefined {
        // Iterate over each zone looking for a match
        for (let i = 0; i < this.zones.length; i++) {
            if (
                (range.start >= this.zones[i].start && range.start <= this.zones[i].end) ||
                (range.end >= this.zones[i].start && range.end <= this.zones[i].end)
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
     * Based on a list of reversals, it will determine if the zone
     * has mutated.
     * @param reversals 
     * @returns boolean
     */
    private zoneMutated(reversals: IReversal[]): boolean {
        let types: IReversalType[] = [];
        reversals.forEach((r) => { types.push(r.type) });
        return types.includes('support') && types.includes('resistance');
    }










    /**
     * Selects the key zones by merging and filtering all detected zones.
     * @param zoneMergeDistanceLimit
     * @param candlesticks1m
     * @returns IKeyZonesData
     */
    private selectKeyZones(zoneMergeDistanceLimit: number, candlesticks1m: ICandlestick[]): IKeyZonesData {
        // Init the key zones
        let keyZones: IKeyZone[] = [];

        // Sort the local zones by start price ascending (low to high)
        this.zones.sort((a, b) => { return a.start - b.start });

        // Check if zones need to be merged and list the key zones volumes
        let merged: boolean = false;
        let vols: number[] = [];

        for (let i = 0; i < this.zones.length; i++) {
            // Make sure there hasn't been a merge
            if (!merged) {
                // Check if there is a next item before proceeding
                if (this.zones[i + 1]) {
                    // Calculate the % change between the current end and the next start
                    const change: number = <number>this._utils.calculatePercentageChange(this.zones[i].end, this.zones[i + 1].start);
                    
                    // Merge the zones if needed
                    if (change <= zoneMergeDistanceLimit) {
                        const mz: IKeyZone = this.mergeZones(this.zones[i], this.zones[i + 1]);
                        keyZones.push(mz);
                        vols.push(mz.volume);
                        merged = true;
                    } 
                    
                    // Otherwise, just add the zone
                    else { 
                        keyZones.push(this.zones[i]);
                        vols.push(this.zones[i].volume);
                    }
                }

                // Checking last zone (unmerged), add it to the final list
                else { 
                    keyZones.push(this.zones[i]);
                    vols.push(this.zones[i].volume);
                }
            } 
            
            // The current item has already been merged with the previous one. Just skip it
            else { merged = false }
        }


        /**
         * Iterate over each selected keyzone and complete the missing properties as well as 
         * building the action history
         */
        let actions: IPriceAction[] = [];
        for (let i = 0; i < keyZones.length; i++) {
            // Calculate the volume score
            keyZones[i].volumeScore = <number>this._utils.outputNumber(
                new BigNumber(keyZones[i].volume).times(10).dividedBy(BigNumber.max.apply(null, vols).toNumber()), 
                {dp: 0, ru: true}
            );

            // Build the key zone's price action data
            const {keyZoneAction, action} = this.buildKeyZonePriceActionData(keyZones[i], candlesticks1m);

            // Set the key zone action
            keyZones[i].action = keyZoneAction;

            // Add the actions to the history
            actions = actions.concat(action);
        }

        // Order the actions by date ascending
        actions.sort((a, b) => { return a.id - b.id });

        // Return the Key Zones Data
        return {keyZones: keyZones, actions: actions};
    }






    /**
     * Merge the properties of the 2 zones provided.
     * @param z1 
     * @param z2 
     * @returns IKeyZone
     */
    private mergeZones(z1: IKeyZone, z2: IKeyZone): IKeyZone {
        // Merge the reversals
        let reversals: IReversal[] = z1.reversals.concat(z2.reversals);

        // Order them by date ascending
        reversals.sort((a, b) => { return a.id - b.id });

        // Return the unified zone
        return {
            id: z1.id < z2.id ? z1.id: z2.id,
            start: <number>this._utils.calculateAverage([z1.start, z2.start]),
            end: <number>this._utils.calculateAverage([z1.end, z2.end]),
            reversals: reversals,
            volume: <number>this._utils.outputNumber(new BigNumber(z1.volume).plus(z2.volume)),
            volumeScore: 0, // Will be populated afterwards
            mutated: this.zoneMutated(reversals),
            action: {touched: 0, broke: 0}
        }
    }










    /**
     * Given a keyzone and a list of 1m candlesticks it will build the action history
     * the keyzone has had since its creation in order to meassure its strength.
     * @param keyZone 
     * @param candlesticks1m 
     * @returns IPriceActionData
     */
    private buildKeyZonePriceActionData(keyZone: IKeyZone, candlesticks1m: ICandlestick[]): IPriceActionData {
        // Init values
        let touched: number = 0;
        let broke: number = 0;
        let action: IPriceAction[] = [];

        // Iterate over each candlestick
        for (let i = 0; i < candlesticks1m.length; i++) {

            // Only check for actions if the candlestick is older than the key zone
            if (candlesticks1m[i].ot > keyZone.id) {

                
            }
        }


        // Return the data
        return {keyZoneAction: {touched: touched, broke: broke}, action: action}
    }
















    /* General Retrievers */




    /**
     * Retrieves all the key zones from the current price.
     * @param price 
     * @param kz 
     * @param above 
     * @returns IKeyZone[]
     */
    private getZonesFromPrice(price: number, kz: IKeyZone[], above: boolean): IKeyZone[] {
        // Init the zones
        let zones: IKeyZone[] = [];

        // Build the zones based on the type
        kz.forEach((z) => { 
            // Build zones that are above the price
            if (above && z.start > price) { zones.push(z) } 
            
            // Build zones that are below the price
            else if (!above && z.end < price) { zones.push(z)}
        });

        /**
         * Order the zones based on the proximity to the price.
         * Zones Above: Order ascending by price
         * Zones Below: Order descending by price
         */
        if (above) { zones.sort((a, b) => { return a.start - b.start}) } 
        else { zones.sort((a, b) => { return b.start - a.start}) }

        // Return the zones
        return zones;
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
            zoneMergeDistanceLimit: typeof config.zoneMergeDistanceLimit == "number" ? config.zoneMergeDistanceLimit: this.zoneMergeDistanceLimit,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }









    
    /**
     * Given the last price, it will return the initial state.
     * @param lastPrice
     * @returns IKeyZonesState
     */
    private getInitialState(lastPrice: number): IKeyZonesState {
        return {
            price: lastPrice,
            zones: [],
            zonesAbove: [],
            zonesBelow: [],
            actions: [],
            resistanceDominance: 0,
            touchedResistance: false,
            brokeResistance: false,
            supportDominance: 0,
            touchedSupport: false,
            brokeSupport: false
        }
    }




    





}