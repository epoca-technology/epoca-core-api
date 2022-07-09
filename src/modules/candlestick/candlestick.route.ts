// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {ultraLowRiskLimit, highRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from '../api-error';
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Candlestick Services
import {ICandlestickService, ICandlestickFileService, ICandlestick} from './interfaces';
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);
const _candlestickFile: ICandlestickFileService = appContainer.get<ICandlestickFileService>(SYMBOLS.CandlestickFileService);

// Background Task
import { IBackgroundTaskInfo } from "../background-task";




// Init Route
const CandlestickRoute = express.Router();






/* Candlesticks General Endpoints */




/**
 * Allows the GUI to verify that the server is running and can take requests.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 3
 * @param start 
 * @param end 
 * @param intervalMinutes 
 * @returns IAPIResponse<ICandlestick[]>
*/
CandlestickRoute.route(`/getForPeriod`).get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3, ['start', 'end', 'intervalMinutes'], req.query);

        // Retrieve the candlesticks
        const data: ICandlestick[] = await _candlestick.getForPeriod(
            Number(req.query.start), 
            Number(req.query.end), 
            Number(req.query.intervalMinutes)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log('CandlestickRoute.getForPeriod', e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










/* Prediction Candlesticks File Endpoints */









/**
 * Retrieves the prediction candlesticks' file's task.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 3
 * @returns IAPIResponse<IBackgroundTaskInfo>
*/
CandlestickRoute.route(`/getPredictionFileTask`).get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3);

        // Return the response
        res.send(_utils.apiResponse(_candlestickFile.preditionFileTask.getTask()));
    } catch (e) {
		console.log(e);
        _apiError.log('CandlestickRoute.getPredictionFileTask', e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Creates the background task that will manage the building and uploading
 * of the prediction candlesticks file.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 3
 * @returns IAPIResponse<IBackgroundTaskInfo>
 */
 CandlestickRoute.route(`/generatePredictionCandlesticksFile`).post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3, undefined, {}, otp || '');

        // Perform Action
        const task: IBackgroundTaskInfo = _candlestickFile.generatePredictionCandlesticksFile();

        // Return the response
        res.send(_utils.apiResponse(task));
    } catch (e) {
		console.log(e);
        _apiError.log('CandlestickRoute.generatePredictionCandlesticksFile', e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});












/* Candlesticks Bundle File Endpoints */









/**
 * Retrieves the candlesticks bundle file's task.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 3
 * @returns IAPIResponse<IBackgroundTaskInfo>
*/
CandlestickRoute.route(`/getBundleFileTask`).get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3);

        // Return the response
        res.send(_utils.apiResponse(_candlestickFile.bundleFileTask.getTask()));
    } catch (e) {
		console.log(e);
        _apiError.log('CandlestickRoute.getBundleFileTask', e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Creates the background task that will manage the building and uploading
 * of the candlesticks bundle file.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 3
 * @returns IAPIResponse<IBackgroundTaskInfo>
 */
 CandlestickRoute.route(`/generateCandlesticksBundleFile`).post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

     try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3, undefined, {}, otp || '');

        // Perform Action
        const task: IBackgroundTaskInfo = _candlestickFile.generateCandlesticksBundleFile();

        // Return the response
        res.send(_utils.apiResponse(task));
    } catch (e) {
		console.log(e);
        _apiError.log('CandlestickRoute.generateCandlesticksBundleFile', e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});








// Export Routes
export {CandlestickRoute}

