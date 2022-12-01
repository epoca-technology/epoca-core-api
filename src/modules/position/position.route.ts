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








/* Position Management */



/**
 * Opens a brand new position on a given side.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param side
 * @returns IAPIResponse<void>
*/
PositionRoute.route("/open").post(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["side"], req.body, otp || "");

        // Perform Action
        await _position.openPosition(req.body.side);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.open", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Increases an existing position based on a given side.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param side
 * @returns IAPIResponse<void>
*/
PositionRoute.route("/increase").post(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["side"], req.body, otp || "");

        // Perform Action
        await _position.increasePosition(req.body.side);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.increase", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Closes an existing position based on a given side.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param side
 * @returns IAPIResponse<void>
*/
PositionRoute.route("/close").post(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["side"], req.body, otp || "");

        // Perform Action
        await _position.closePosition(req.body.side);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.close", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});












/* Position Strategy Management */




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








/* Position History */





/**
 * Retrieves the position history for a given range. 
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param startAt 
 * @param endAt 
 * @returns IAPIResponse<any>
*/
PositionRoute.route("/getHist").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["startAt", "endAt"], req.query);

        // Retrieve the data
        const data: any = await _position.getHist(Number(req.query.startAt), Number(req.query.endAt));

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.getHist", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










// Export Routes
export {PositionRoute}
