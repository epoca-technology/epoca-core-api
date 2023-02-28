import { IEpochRecord } from "../epoch";
import { IServerData, IServerResources } from "../server";
import { IApiError } from "../api-error";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IPredictionState, IPredictionStateIntesity } from "../prediction";
import { 
    ILongShortRatioState, 
    IMarketState, 
    IMinifiedTAState, 
    IOpenInterestState, 
    IState, 
    IVolumeState 
} from "../market-state";
import { IPositionSummary } from "../position";




// Service
export interface IBulkDataService {
    // App Bulk Retrievers
    getAppBulk(epochID: string): Promise<IAppBulk>,

    // App Bulk Stream
    initialize(): Promise<void>,
    stop(): void,

    // Server Bulk Retrievers
    getServerDataBulk(): Promise<IServerDataBulk>,
    getServerResourcesBulk(): Promise<IServerResourcesBulk>,
}









/**
 * App Bulk
 * The app bulk is an object containing all the data required by the
 * GUI to operate and stay in sync with the server.
 */
export interface IAppBulk {
    // The current time of the server. The user's time should not be trusted
    serverTime: number,

    // The current version of the GUI
    guiVersion: string,

    /**
     * The record of the active epoch which can come in several states. 
     * IEpochRecord: There is an active epoch that has not been yet retrieved by the client.
     * undefined: No epoch is currently active
     * "keep": The client's epoch is up to date and can be kept
     */
    epoch: IEpochRecord|"keep"|undefined,

    // The active prediction. If there isn't one, or an epoch isn't active, it will be undefined
    prediction: IPrediction|undefined,

    // The active prediction state. If there isn't one, or an epoch isn't active, it will be 0
    predictionState: IPredictionState,

    // The active prediction state intensity. If there isn't one, or an epoch isn't active, it will be 0
    predictionStateIntesity: IPredictionStateIntesity, 

    // The current signal based on the cancellation policies
    signal: IPredictionResult,

    // The current position summary
    position: IPositionSummary,

    // The active market state.
    marketState: IMarketState,

    // The number of api errors in existance
    apiErrors: number,
}




/**
 * App Bulk Stream
 * A compressed version of the App Bulk that is updated at a high
 * frequency.
 */
export interface IAppBulkStream {
    // The active prediction. If there isn't one, or an epoch isn't active, it will be undefined
    prediction: IPrediction|undefined,

    // The active prediction state. If there isn't one, or an epoch isn't active, it will be 0
    predictionState: IPredictionState,

    // The active prediction state intensity. If there isn't one, or an epoch isn't active, it will be 0
    predictionStateIntesity: IPredictionStateIntesity, 

    // The current signal based on the cancellation policies
    signal: IPredictionResult,

    // The current position summary
    position: IPositionSummary,

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
    volume: IVolumeState,
    open_interest: IOpenInterestState,
    open_interest_bybit: IOpenInterestState,
    open_interest_okx: IOpenInterestState,
    open_interest_huobi: IOpenInterestState,
    long_short_ratio: ILongShortRatioState,
    long_short_ratio_tta: ILongShortRatioState,
    long_short_ratio_ttp: ILongShortRatioState,
    technical_analysis: IMinifiedTAState
}

export interface ICompressedWindowState extends IState {
    // The compressed prediction candlesticks that comprise the window
    window: ICompressedCandlesticks
}

export interface ICompressedCandlesticks {
    ot: number[],                 // Open Times
    ct: number[],                 // Close Times
    o: number[],                  // Open Prices
    h: number[],                  // High Prices
    l: number[],                  // Low Prices
    c: number[],                  // Close Prices
    v: number[]                   // Volumes (USDT)
}







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