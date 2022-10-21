// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Request Guard
import {IRequestGuardService, mediumRiskLimit, lowRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Prediction Service
import {IPredictionCandlestick, IPredictionService} from "./interfaces";
const _prediction: IPredictionService = appContainer.get<IPredictionService>(SYMBOLS.PredictionService);

// Epoch Builder Types
import { IPrediction } from "../epoch-builder";




// Init Route
const PredictionRoute = express.Router();









/**
 * Retrieves the active prediction. If there isn't an active one,
 * it returns undefined.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IPrediction|undefined>
*/
/*PredictionRoute.route("/getActive").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_prediction.active.value));
    } catch (e) {
		console.log(e);
        _apiError.log("PredictionRoute.getActive", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});*/








/**
 * Retrieves a list of predictions based on provided params.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param epochID 
 * @param startAt 
 * @param endAt 
 * @returns IAPIResponse<IPrediction[]>
 * @TODO :
 *    1) Replace ultraLowRiskLimit with mediumRiskLimit
*/
PredictionRoute.route("/listPredictions").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["epochID", "startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IPrediction[] = await _prediction.listPredictions(
            <string>req.query.epochID,
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PredictionRoute.listPredictions", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










/**
 * Retrieves a list of prediction candlesticks based on provided params.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param epochID 
 * @param startAt 
 * @param endAt 
 * @returns IAPIResponse<IPredictionCandlestick[]>
*/
PredictionRoute.route("/listPredictionCandlesticks").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["epochID", "startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IPredictionCandlestick[] = await _prediction.listPredictionCandlesticks(
            <string>req.query.epochID,
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("PredictionRoute.listPredictionCandlesticks", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});









// Export Routes
export {PredictionRoute}

