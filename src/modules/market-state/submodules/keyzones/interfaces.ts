import { ICandlestick } from "../../../candlestick";
import { ISplitStates } from "../_shared";
import { ILiquidityState } from "../liquidity";




// Service
export interface IKeyZonesService {
    // Properties
    config: IKeyZonesConfiguration,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // State Calculation
    calculateState(
        windowSplitStates?: ISplitStates, 
        liquidityState?: ILiquidityState
    ): IKeyZoneState|IKeyZoneFullState,
    getDefaultState(): IKeyZoneState,

    // KeyZones Event Record Management
    listKeyZoneEvents(startAt: number, endAt: number): Promise<IKeyZoneStateEvent[]>,

    // Configuration Management
    updateConfiguration(newConfiguration: IKeyZonesConfiguration): Promise<void>
}



// Model
export interface IKeyZonesModel {
    // KeyZones Event Record Management
    listKeyZoneEvents(startAt: number, endAt: number): Promise<IKeyZoneStateEvent[]>,
    saveKeyZoneEvent(evt: IKeyZoneStateEvent): Promise<void>,

    // KeyZones Configuration Management
    getConfigurationRecord(): Promise<IKeyZonesConfiguration|undefined>,
    createConfigurationRecord(defaultConfiguration: IKeyZonesConfiguration): Promise<void>,
    updateConfigurationRecord(newConfiguration: IKeyZonesConfiguration): Promise<void>
}



// Validations
export interface IKeyZonesValidations {
    // KeyZones Event Record Management
    canKeyZoneEventsBeListed(startAt: number, endAt: number): void,

    // KeyZones Configuration Management
    validateConfiguration(config: IKeyZonesConfiguration): void
}






/**
 * Score Weights
 * The values used to score a KeyZone based on the most relevant parameters.
 */
export interface IKeyZoneScoreWeights {
    // The worth of the KeyZone's Volume Intensity
    volume_intensity: number,

    // The worth of the KeyZone's Liquidity Share
    liquidity_share: number,
}


/**
 * Configuration
 * The KeyZones' Module Configuration that can be managed from the GUI.
 */
export interface IKeyZonesConfiguration {
    /**
     * Build Frequency
     * Once the KeyZones Module is initialized, a build is made and an interval
     * that will re-build the KeyZones every buildFrequencyHours is started.
     */
    buildFrequencyHours: number,

    /**
     * Build Lookback Size
     * The number of 15-minute-interval candlesticks that will be used to build
     * the KeyZones.
     */
    buildLookbackSize: number,

    /**
     * Zone Size
     * The zone's size percentage. The start and end prices are based on this value.
     */
    zoneSize: number,

    /**
     * Merge Distance
     * Once all zones have been set and ordered by price, it will merge the ones that 
     * are close to one another.
     */
    zoneMergeDistanceLimit: number,

    /**
     * State Limit
     * Limits the number of zones returned from the current price. For example, 
     * if 2 is provided, it retrieves 4 zones in total (2 above and 2 below)
     */
    stateLimit: number,

    /**
     * Score Weights
     * The object containing the weights that will be used to calculate a 
     * KeyZone's Score. The score should be limitted to a number from 0 to 10.
     */
    scoreWeights: IKeyZoneScoreWeights,

    /**
     * Price Snapshots Limit
     * The limit of the 1-minute-candlestick snapshots that are taken whenever
     * there is an update (every ~3 seconds).
     */
    priceSnapshotsLimit: number,

    /**
     * Event Duration
     * The number of minutes a KeyZone event will remain active after being
     * issued based on its kind. A KeyZone Event can also be terminated by the
     * price based on eventPriceDistanceLimit.
     */
    supportEventDurationMinutes: number,
    resistanceEventDurationMinutes: number,

    /**
     * Event Price Distance Limit
     * When an event is issued, a price limit is set based on the kind of 
     * KeyZone Contant. For example: If a support keyzone event is issued,
     * the price limit will be the end of the zone (upperband) + eventPriceDistanceLimit%.
     * If the price starts increasing and goes past this price, the KeyZone Event
     * will be cleared.
     * On the contrary, when a resistance event is issued, the price limit will
     * be the start of the zone (lowerband) - eventPriceDistanceLimit%. If the price
     * starts decreasing and goes past this price, the event will be cleared.
     */
    eventPriceDistanceLimit: number,

    /**
     * KeyZone Idle Duration
     * The number of minutes a KeyZone will remain idle after issuing an event.
     */
    keyzoneIdleOnEventMinutes: number,

    /**
     * Event Score Requirement
     * The minimum score needed by a KeyZone in order to be capable of issuing
     * an event.
     */
    eventScoreRequirement: number
}






/**
 * Reversal Type
 * A reversal can be of 2 kinds:
 * Resistance: Price touches a resistance zone and reverses.
 * Support: Price touches a support zone and reverses.
 */
export type IReversalType = "r"|"s"; // r = Resistance | s = Support



/**
 * Reversal
 * A series of reversals are detected based on the daily candlesticks and then
 * included into a "KeyZone".
 */
export interface IReversal {
    id: number, // The open time of the candlestick in which the reversal was detected
    t: IReversalType,
    v: number
}



/**
 * Volume Intensity
 * The intensity of the volume within the KeyZone.
 */
export type IKeyZoneVolumeIntensity = 0|1|2|3|4;





/**
 * Idle KeyZones
 * When an event is detected on a KeyZone, this one becomes idle for a period
 * of time. While idling, a KeyZone cannot emmit events.
 */
export interface IIdleKeyZones {
    [keyzoneID: number]: number // KeyZone ID: Idle Until Timestamp
}



/**
 * KeyZone Price Range
 * The price range that comprises a KeyZone.
 */
export interface IKeyZonePriceRange {
    s: number,  // Start Price (Highest High or Lowest Low)
    e: number   // End Price (+/- zone_size% from start price)
}


/**
 * KeyZone
 * A keyzone is a price range in which the price will likely reverse.
 */
export interface IMinifiedKeyZone extends IKeyZonePriceRange {
    // The date in which the keyzone was first detected
    id: number,

    // Volume Intensity
    vi: IKeyZoneVolumeIntensity,

    // Liquidity Share
    ls: number,

    // KeyZone Score
    scr: number
}
export interface IKeyZone extends IKeyZonePriceRange {
    // The date in which the keyzone was first detected
    id: number,

    // List of reversals that took place at the zone, ordered by date ascending
    r: IReversal[],

    // A KeyZone is considered to have mutated when it has reversed in both ways
    m: boolean,

    // The volume mean and intensity
    vm: number,
    vi: IKeyZoneVolumeIntensity
}



/**
 * KeyZone State Event
 * The state event indicates that a KeyZone with a score greater than or equals
 * to the requirement has been hit by the market.
 */
export type IKeyZoneStateEventKind = "s"|"r";
export interface IKeyZoneStateEvent {
    // The kind of event
    k: IKeyZoneStateEventKind,

    // The KeyZone that was hit by the price
    kz: IMinifiedKeyZone,

    // The time at which the event was issued
    t: number,

    // The event's expiration timestamp
    e: number,

    // The event's price limit
    pl: number
}



/**
 * KeyZone State
 * A state can be generated by providing the latest price. It will check if the price
 * is in a zone and return the zones nearby.
 */
export interface IKeyZoneState {
    // The active state event (if any)
    event: IKeyZoneStateEvent|null,

    // The keyzone the price is in (if any)
    active: IMinifiedKeyZone|null,

    // The list of keyzones above the current price
    above: IMinifiedKeyZone[],

    // The list of keyzones below the current price
    below: IMinifiedKeyZone[],
}



/**
 * KeyZone Full State
 * An object containing the full KeyZone State. Can only be obtained through the
 * market state route. 
 */
export interface IKeyZoneFullState {
    // The keyzone the price is in (if any)
    active: IKeyZone|null,

    // The list of keyzones above the current price
    above: IKeyZone[],

    // The list of keyzones below the current price
    below: IKeyZone[],

    // The price snapshots
    price_snapshots: ICandlestick[],

    // Idle KeyZones
    idle: IIdleKeyZones,

    // The timestamp in which the build was generated
    build_ts: number
}