// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Request Guard
import {ultraLowRiskLimit, lowRiskLimit, ultraHighRiskLimit, IRequestGuardService, mediumRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Epoch Service
import {IEpochListItem, IEpochRecord, IEpochService} from "./interfaces";
const _epoch: IEpochService = appContainer.get<IEpochService>(SYMBOLS.EpochService);

// Background Task
import { IBackgroundTaskInfo } from "../background-task";

// Epoch Builder Types
import { IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";




// Init Route
const EpochRoute = express.Router();






/* Epoch Retriever Endpoints */




/**
 * Retrieves an Epoch Record. In case it doesn't exist, it returns undefined.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param epochID
 * @returns IAPIResponse<IEpochRecord|undefined>
*/
EpochRoute.route("/getEpochRecord").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["epochID"], req.query);

        // Retrieve the data
        const data: IEpochRecord|undefined = await _epoch.getEpochRecord(<string>req.query.epochID);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.getEpochRecord", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Retrieves the list of epochs based on a given starting point and limit.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param startAt
 * @param limit
 * @returns IAPIResponse<IEpochListItem[]>
*/
EpochRoute.route("/listEpochs").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["startAt", "limit"], req.query);

        // Retrieve the data
        const data: IEpochListItem[] = await _epoch.listEpochs(Number(req.query.startAt), Number(req.query.limit));

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.listEpochs", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});















/* Epoch Install Endpoints */





/**
 * Creates the background task that will manage the installation of an Epoch
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param epochID
 * @returns IAPIResponse<IBackgroundTaskInfo>
 */
 EpochRoute.route("/install").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["epochID"], req.body, otp || "");

        // Perform Action
        const task: IBackgroundTaskInfo = await _epoch.install(req.body.epochID);

        // Return the response
        res.send(_utils.apiResponse(task));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.install", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});



/**
 * Retrieves the Epoch Install Task with the current state.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 4
 * @returns IAPIResponse<IBackgroundTaskInfo>
*/
EpochRoute.route("/getInstallTask").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4);

        // Return the response
        res.send(_utils.apiResponse(_epoch.installTask.getTask()));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.getInstallTask", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
 * Creates the background task that will manage the uninstallation of an Epoch
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @returns IAPIResponse<IBackgroundTaskInfo>
 */
 EpochRoute.route("/uninstall").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, undefined, {}, otp || "");

        // Perform Action
        const task: IBackgroundTaskInfo = await _epoch.uninstall();

        // Return the response
        res.send(_utils.apiResponse(task));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.uninstall", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});




/**
 * Retrieves the Epoch Uninstall Task with the current state.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 4
 * @returns IAPIResponse<IBackgroundTaskInfo>
*/
EpochRoute.route("/getUninstallTask").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4);

        // Return the response
        res.send(_utils.apiResponse(_epoch.uninstallTask.getTask()));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.getUninstallTask", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});











/* Certificate Retriever Endpoints */







/**
 * Retrieves a Prediction Model Certificate based on its ID.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param id
 * @returns IAPIResponse<IPredictionModelCertificate>
*/
EpochRoute.route("/getPredictionModelCertificate").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["id"], req.query);

        // Retrieve the data
        const data: IPredictionModelCertificate = await _epoch.getPredictionModelCertificate(<string>req.query.id);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.getPredictionModelCertificate", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
 * Retrieves a Regression Certificate based on its ID.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param id
 * @returns IAPIResponse<IRegressionTrainingCertificate>
*/
EpochRoute.route("/getRegressionCertificate").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["id"], req.query);

        // Retrieve the data
        const data: IRegressionTrainingCertificate = await _epoch.getRegressionCertificate(<string>req.query.id);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("EpochRoute.getRegressionCertificate", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










// Export Routes
export {EpochRoute}

