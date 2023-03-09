// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, ultraHighRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Signal Service
import {ISignalService} from "./interfaces";
import { IBinancePositionSide } from "../binance";
const _signal: ISignalService = appContainer.get<ISignalService>(SYMBOLS.SignalService);


// Init Route
const SignalRoute = express.Router();






/**
* Retrieves the Signal Policies for a side.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param side 
* @returns IAPIResponse<ISignalSidePolicies>
*/
SignalRoute.route("/getPolicies").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["side"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_signal.getPolicies(<IBinancePositionSide>req.query.side)));
    } catch (e) {
		console.log(e);
        _apiError.log("SignalRoute.getPolicies", e, reqUid, ip, {side: req.query.side});
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Updates the Signal Policies for a side.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param side
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
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["side", "newPolicies"], req.body, otp || "");

        // Perform Action
        await _signal.updatePolicies(req.body.side, req.body.newPolicies);

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

