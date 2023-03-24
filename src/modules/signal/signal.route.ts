// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, mediumRiskLimit, ultraHighRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Signal Service
import {ISignalService, ISignalPolicies, ISignalRecord} from "./interfaces";
const _signal: ISignalService = appContainer.get<ISignalService>(SYMBOLS.SignalService);


// Init Route
const SignalRoute = express.Router();






/**
* Retrieves the Active Signal Policies.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ISignalPolicies>
*/
SignalRoute.route("/getPolicies").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(<ISignalPolicies>_signal.policies));
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.getPolicies", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Updates the Active Signal Policies.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param newPolicies
 * @returns IAPIResponse<void>
*/
SignalRoute.route("/updatePolicies").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["newPolicies"], req.body, otp || "");

        // Perform Action
        await _signal.updatePolicies(req.body.newPolicies);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.updatePolicies", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
 * Retrieves a list of predictions based on provided params.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param epochID 
 * @param startAt 
 * @param endAt 
 * @returns IAPIResponse<ISignalRecord[]>
*/
SignalRoute.route("/getSignalRecords").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["startAt", "endAt"], req.query);

        // Retrieve the data
        const data: ISignalRecord[] = await _signal.listSignalRecords(
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.getSignalRecords", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







// Export Routes
export {SignalRoute}

