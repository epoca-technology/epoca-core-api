// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Request Guard
import {IRequestGuardService, mediumRiskLimit, highRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Signal Service
import {ISignalService} from "./interfaces";
const _signal: ISignalService = appContainer.get<ISignalService>(SYMBOLS.SignalService);




// Init Route
const SignalRoute = express.Router();








/**
 * Retrieves the current cancellation policies.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IPredictionCancellationPolicies>
*/
SignalRoute.route("/getPolicies").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the policies
        res.send(_utils.apiResponse(_signal.policies));
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.getPolicies", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










/**
 * Updates the current cancellation policies.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param policies
 * @returns IAPIResponse<void>
*/
SignalRoute.route("/updatePolicies").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
            ["LONG", "SHORT"], 
            req.body, 
            otp || ""
        );

        // Perform Action
        await _signal.updatePolicies(req.body);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.updatePolicies", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});








// Export Routes
export {SignalRoute}

