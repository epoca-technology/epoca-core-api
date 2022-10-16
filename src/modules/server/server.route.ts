// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";



// Request Guard
import {highRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Server Service
import {IServerService} from "../server";
const _server: IServerService = appContainer.get<IServerService>(SYMBOLS.ServerService);



// Init Route
const ServerRoute = express.Router();







/* Retrievers */



/**
 * Retrieves the Server"s Data. If it hasn"t been initialized, the 
 * values will be the defaults.
 * @requires authority: 3
 * @returns IAPIResponse<IServerData>
*/
/*ServerRoute.route(`/getServerData`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3);

        // Return the response
        res.send(_utils.apiResponse(_server.getServerData()));
    } catch (e) {
		console.log(e);
        _apiError.log("ServerRoute.getServerData", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});*/









/**
 * Retrieves the Server"s Resources. If it hasn"t been initialized, the 
 * values will be the defaults.
 * @requires authority: 3
 * @returns IAPIResponse<IServerResources>
*/
/*ServerRoute.route(`/getServerResources`).get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3);

        // Return the response
        res.send(_utils.apiResponse(_server.getServerResources()));
    } catch (e) {
		console.log(e);
        _apiError.log("ServerRoute.getServerResources", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});*/












/* Alarms Management */




/**
 * Updates the Server Alarms Configuration.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param max_file_system_usage
 * @param max_memory_usage
 * @param max_cpu_load
 * @param max_cpu_temperature
 * @param max_gpu_load
 * @param max_gpu_temperature
 * @param max_gpu_memory_temperature
 * @returns IAPIResponse<void>
*/
ServerRoute.route("/setAlarmsConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(
            idToken, 
            apiSecret, 
            ip, 
            4, 
            ["max_file_system_usage", "max_memory_usage", "max_cpu_load", "max_cpu_temperature", "max_gpu_load", "max_gpu_temperature", "max_gpu_memory_temperature"], 
            req.body, 
            otp || ""
        );

        // Perform Action
        await _server.setAlarmsConfiguration(req.body);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("ServerRoute.setAlarmsConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});















/* Essential Routes */





/**
 * Allows the GUI to retrieve the current server time.
 * @returns IAPIResponse<number>
 */
/*ServerRoute.route(`/time`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send(_utils.apiResponse(Date.now()));
});*/





// Export Routes
export {ServerRoute}

