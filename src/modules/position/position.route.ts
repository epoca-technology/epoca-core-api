// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";



// Request Guard
import {IRequestGuardService, lowRiskLimit, mediumRiskLimit, ultraHighRiskLimit, ultraLowRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Position Service
import {IPositionActionKind, IPositionActionRecord, IPositionHeadline, IPositionRecord, IPositionService} from "../position";
const _position: IPositionService = appContainer.get<IPositionService>(SYMBOLS.PositionService);



// Init Route
const PositionRoute = express.Router();









/***********************
 * Position Retrievers *
 ***********************/





/**
 * Retrieves a position record by ID.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param id
 * @returns IAPIResponse<IPositionRecord>
*/
PositionRoute.route("/getPositionRecord").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["id"], req.query);

        // Retrieve the data
        const data: IPositionRecord = await _position.getPositionRecord(<string>req.query.id);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.getPositionRecord", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Retrieves a list of headlines based on given date range.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param startAt
 * @param endAt
 * @returns IAPIResponse<IPositionHeadline[]>
*/
PositionRoute.route("/listPositionHeadlines").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IPositionHeadline[] = await _position.listPositionHeadlines(
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.listPositionHeadlines", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
 * Retrieves a list of position action payloads based on given kind & date range.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param kind
 * @param startAt
 * @param endAt
 * @returns IAPIResponse<IPositionActionRecord[]>
*/
PositionRoute.route("/listPositionActionPayloads").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["kind", "startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IPositionActionRecord[] = await _position.listPositionActionPayloads(
            <IPositionActionKind>req.query.kind,
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.listPositionActionPayloads", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});















/********************
 * Position Actions *
 ********************/






/**
 * Closes an active position for the given symbol.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param symbol
 * @returns IAPIResponse<void>
*/
PositionRoute.route("/closePosition").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["symbol"], req.body, otp || "");

        // Perform Action
        await _position.closePosition(req.body.symbol);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PositionRoute.closePosition", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});






























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

