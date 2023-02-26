// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Request Guard
import {IRequestGuardService, mediumRiskLimit, lowRiskLimit, ultraHighRiskLimit} from "../request-guard";
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









/**********************
 * Prediction Records *
 **********************/




/**
 * Retrieves a list of predictions based on provided params.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param epochID 
 * @param startAt 
 * @param endAt 
 * @returns IAPIResponse<IPrediction[]>
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










/***************************
 * Prediction Candlesticks *
 ***************************/





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










/*************************************
 * Prediction State Intensity Config *
 *************************************/




/**
 * Retrieves the current prediction state intensity config.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IPredictionStateIntensityConfig>
*/
PredictionRoute.route("/getStateIntensityConfig").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_prediction.stateIntensityConfig));
    } catch (e) {
		console.log(e);
        _apiError.log("PredictionRoute.getStateIntensityConfig", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Updates the Position Health Weights.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param newConfig
 * @returns IAPIResponse<void>
*/
PredictionRoute.route("/updateStateIntensityConfig").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["newConfig"], req.body, otp || "");

        // Perform Action
        await _prediction.updateStateIntensityConfig(req.body.newConfig);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("PredictionRoute.updateStateIntensityConfig", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});











// Export Routes
export {PredictionRoute}

