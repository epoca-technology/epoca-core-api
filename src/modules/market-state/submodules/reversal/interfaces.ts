import { ICoinsCompressedState } from "../coins";
import { IKeyZoneState, IKeyZoneStateEvent } from "../keyzones";
import { ILiquidityState } from "../liquidity";
import { IVolumeStateIntensity } from "../volume";




// Service
export interface IReversalService {
    // Properties
    config: IReversalConfiguration,

    // Initialization
    initialize(): Promise<void>,
    stop(): void,

    // State Calculation
    calculateState(
        volume: IVolumeStateIntensity,
        keyzones: IKeyZoneState, 
        liquidity: ILiquidityState, 
        coins: ICoinsCompressedState,
        coinsBTC: ICoinsCompressedState
    ): IMinifiedReversalState,
    getDefaultState(): IMinifiedReversalState,

    // Reversal State Management
    getReversalState(id: number): Promise<IReversalState>,
    getReversalCoinsStates(id: number): Promise<IReversalCoinsStates>,

    // Configuration Management
    updateConfiguration(newConfiguration: IReversalConfiguration): Promise<void>,
}


// Model
export interface IReversalModel {
    // Reversal State Management
    getReversalState(id: number): Promise<IReversalState>,
    getReversalCoinsStates(id: number): Promise<IReversalCoinsStates>,
    saveState(state: IReversalState, coinsStates: IReversalCoinsStates): Promise<void>,

    // Configuration Record Management
    getConfigurationRecord(): Promise<IReversalConfiguration|undefined>,
    createConfigurationRecord(defaultConfiguration: IReversalConfiguration): Promise<void>,
    updateConfigurationRecord(newConfiguration: IReversalConfiguration): Promise<void>
}



// Validations
export interface IReversalValidations {
    // General
    validateReversalID(id: number): void,

    // Configuration Management
    validateConfiguration(newConfiguration: IReversalConfiguration): void
}








/**
 * Reversal Kind
 * The kind of reversal that is taking place. The value is consistant with
 * the reversal direction. For instance, if there is an active support 
 * contant event ("s"), the reversal kind is 1. In the case of a resistance
 * contact, the reversal kind will be -1. If there is no active KeyZone Event,
 * the reversal kind will be 0.
 */
export type IReversalKind = -1|0|1;



/**
 * Reversal Score Weights
 * In order to determine if a reversal is taking place, a score system that makes
 * use of all other relevant modules will be frequently calculated and is capable
 * of issuing a reversal state once the score reaches reversal_score_requirement.
 */
export interface IReversalScoreWeights {
    // The maximum score that can be obtained by the volume module
    volume: number,

    // The maximum score that can be obtained by the liquidity module
    liquidity: number,

    // The maximum score that can be obtained by the coins module
    coins: number,

    // The maximum score that can be obtained by the coins btc module
    coins_btc: number
}



/**
 * Configuration
 * The Reversal's Module Configuration that can be managed from the GUI.
 */
export type IReversalEventSortFunction = "SHUFFLE"|"CHANGE_SUM";
export interface IReversalConfiguration {
    // The minimum score required for a support/resistance  reversal event to be issued
    support_reversal_score_requirement: number,
    resistance_reversal_score_requirement: number,

    /**
     * The sorting mechanism that will be used to order the symbols that are
     * compliant with the kind of reversal.
     */
    event_sort_func: IReversalEventSortFunction,

    // The weights by module that will be used to calculate the score
    score_weights: IReversalScoreWeights
}




/**
 * Reversal Score History
 * The object containing the entire score history since the KeyZone Event
 * was issued. The current score can be accessed through g.at(-1).
 */
export interface IReversalScoreHistory {
    // General Score - The sum of all the points accumulated by the modules
    g: number[],

    // Volume Score
    v: number[],

    // Liquidity Score
    l: number[],

    // Coins' Score
    c: number[],

    // Coins' BTC Score
    cb: number[]
}





/**
 * Reversal Event
 * The event that is issued once the general score reaches reversal_score_requirement and
 * there are coins that followed the reversal. Note that if there aren't coins
 * that followed, no reversal event will be issued.
 */
export interface IReversalEvent {
    // The time at which the event was issued
    t: number,

    // The list of symbols that complied with the reversal
    s: string[]
}




/**
 * Reversal State
 * The full state object that contains all important information as well
 * as the score history. When the KeyZone event fades away, this record
 * is stored in the database.
 */
export interface IReversalState {
    /**
     * The reversal's identifier. This value is equals to the time in which the KeyZone event 
     * was issued and can be considered to be the "start" of the reversal state.
     */
    id: number,

    // The time at which the KeyZone Event faded away
    end: number|null, // <- Only populated when ended

    // The kind of reversal that is taking place
    k: IReversalKind,

    // The KeyZone State Event that is being evaluated
    kze: IKeyZoneStateEvent|null,

    /**
     * The initial and final state of all the coins. These values are used
     * to determine which coins followed the reversal.
     */


    // The score object containing the points' history by module. 
    scr: IReversalScoreHistory,

    /**
     * The reversal event, only populated when the event has been issued. Notice
     * that the event can only be issued once even though the score continues
     * to be calculated until the KeyZone Event fades away.
     */
    e: IReversalEvent|null
}




/**
 * Reversal Coins States
 * Since the states of all the coins can be heavy, it is separated and stored
 * in a different db table.
 */
export interface IReversalCoinsStates {
    // Initial state of the coins when the keyzone was hit by the price
    initial: ICoinsCompressedState,

    // The state of the coins when the event was officially issues
    event: ICoinsCompressedState|null,

    // The state of the coins when the KeyZone Event ended.
    final: ICoinsCompressedState|null
}






/**
 * Minified Reversal State
 * The minified reversal object containing only essential data.
 */
export interface IMinifiedReversalState {
    // Reversal's Identifier
    id: number,

    // The kind of reversal that is taking place
    k: IReversalKind,

    // The total accumulated score so far
    s: number,

    // Reversal Event
    e: IReversalEvent|null
}