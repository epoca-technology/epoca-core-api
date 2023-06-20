// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Bulk Data Service
import {IBulkDataService, IAppBulk, IServerDataBulk, IServerResourcesBulk} from "./interfaces";
const _bulk: IBulkDataService = appContainer.get<IBulkDataService>(SYMBOLS.BulkDataService);


// Init Route
const BulkDataRoute = express.Router();






/* App Bulk Retrievers */



/**
* Retrieves the App Bulk.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IAppBulk>
*/
BulkDataRoute.route("/getAppBulk").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Perform Action
        const data: IAppBulk = await _bulk.getAppBulk();

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("BulkDataRoute.getAppBulk", e, reqUid, ip, {epochID: req.query.epochID});
        res.send(_utils.apiResponse(undefined, e));
    }
});









/* Server Bulk Retrievers */




/**
* Retrieves the Server Data Bulk.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IServerDataBulk>
*/
BulkDataRoute.route("/getServerDataBulk").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Perform Action
        const data: IServerDataBulk = await _bulk.getServerDataBulk();

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("BulkDataRoute.getServerDataBulk", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Retrieves the Server Resources Bulk.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IServerResourcesBulk>
*/
BulkDataRoute.route("/getServerResourcesBulk").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Perform Action
        const data: IServerResourcesBulk = await _bulk.getServerResourcesBulk();

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("BulkDataRoute.getServerResourcesBulk", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







// Export Routes
export {BulkDataRoute}

