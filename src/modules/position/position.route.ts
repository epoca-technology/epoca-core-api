// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";



// Request Guard
import {IRequestGuardService, mediumRiskLimit, ultraHighRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Position Service
import {IPositionService} from "../position";
const _position: IPositionService = appContainer.get<IPositionService>(SYMBOLS.PositionService);



// Init Route
const PositionRoute = express.Router();









/***********************
 * Position Management *
 ***********************/


// ...

















/********************************
 * Position Strategy Management *
 ********************************/





/**
 * Retrieves the current position strategy
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IPositionStrategy>
*/
PositionRoute.route("/getStrategy").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_position.strategy));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.getStrategy", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Updates the Position Strategy Configuration.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param newStrategy
 * @returns IAPIResponse<void>
*/
PositionRoute.route("/updateStrategy").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["newStrategy"], req.body, otp || "");

        // Perform Action
        await _position.updateStrategy(req.body.newStrategy);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.updateStrategy", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});






















/***************************
 * Futures Account Balance *
 ***************************/





/**
 * Retrieves the account's balance in the futures wallet.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IAccountBalance>
*/
PositionRoute.route("/getBalance").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_position.balance));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.getBalance", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});






















// Export Routes
export {PositionRoute}

