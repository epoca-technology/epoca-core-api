import { IServerData, IServerResources } from "../server";
import { IApiError } from "../api-error";
import { 
    ICoinsState,
    IKeyZoneState,
    IMarketState, 
    IMinifiedLiquidityState, 
    IMinifiedReversalState, 
    ISplitStates, 
    IStateType,
    IVolumeStateIntensity,
} from "../market-state";
import { IActivePositionHeadlines } from "../position";
import { ICandlestick } from "../candlestick";
import { IAuthorities } from "../auth";




// Service
export interface IBulkDataService {
    // App Bulk Retrievers
    getAppBulk(): Promise<IAppBulk>,

    // App Bulk Stream
    initialize(): Promise<void>,
    stop(): void,

    // Server Bulk Retrievers
    getServerDataBulk(): Promise<IServerDataBulk>,
    getServerResourcesBulk(): Promise<IServerResourcesBulk>,
}











/************
 * App Bulk *
 ************/




/**
 * App Bulk
 * The app bulk is an object containing all the data required by the
 * GUI to operate and stay in sync with the server.
 */
export interface IAppBulk {
    // The current time of the server. The user's time should not be trusted
    serverTime: number,

    // The authorities object
    authorities: IAuthorities,

    // The current version of the GUI
    guiVersion: string,

    // The list of active position headlines
    positions: IActivePositionHeadlines,

    // The active market state.
    marketState: IMarketState,

    // The number of api errors in existance
    apiErrors: number,

    // The minimum score requirement for a KeyZone to issue an event
    keyzoneEventScoreRequirement: number,
}




/**
 * App Bulk Stream
 * A compressed version of the App Bulk that is updated at a high
 * frequency.
 */
export interface IAppBulkStream {
    // The list of active position headlines
    positions: IActivePositionHeadlines,

    // The active market state.
    marketState: ICompressedMarketState,

    // The number of api errors in existance
    apiErrors: number,
}


/**
 * Compressed Market State
 * In order to reduce the bandwidth, the market state is compressed
 * and then decompressed when downloaded from the GUI.
 */
export interface ICompressedMarketState {
    window: ICompressedWindowState,
    volume: IVolumeStateIntensity,
    liquidity: IMinifiedLiquidityState,
    keyzones: IKeyZoneState,
    coins: ICoinsState,
    coinsBTC: ICoinsState,
    reversal: IMinifiedReversalState
}

export interface ICompressedWindowState {
    // The state of the window
    s: IStateType,

    // The split states payload
    ss: ISplitStates,
    
    // The current prediction candlestick
    w: ICandlestick
}













/**********
 * Server *
 **********/






/**
 * Server Data Bulk
 * The server data bulk is an object containing all the server data,
 * as well as the API Errors.
 */
export interface IServerDataBulk {
    // The server data object containing current state and resources
    serverData: IServerData,

    // The list of API errors
    apiErrors: IApiError[]
}






/**
 * Server Resources Bulk
 * The server resources bulk is an object containing a minified server resources object,
 * as well as the API Errors.
 */
 export interface IServerResourcesBulk {
    // The server data object containing current state and resources
    serverResources: IServerResources,

    // The list of API errors
    apiErrors: IApiError[]
}