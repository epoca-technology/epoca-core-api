import { IEpochSummary } from "../epoch";
import { IServerData, IServerResources } from "../server";
import { IApiError } from "../api-error";
import { IPrediction } from "../epoch-builder";




// Service
export interface IBulkDataService {
    // App Bulk Retrievers
    getAppBulk(): IAppBulk,

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

    // The summary of the active epoch. If none is active, it will be undefined
    epoch: IEpochSummary|undefined,

    // The active prediction. If there isn't one, or an epoch isn't active, it will be undefined
    prediction: IPrediction|undefined,

    // The list of trading simulations, If none is active, it will be an empty list
    simulations: any[],

    // The active session. If none is active, it will be undefined.
    session: object|undefined
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