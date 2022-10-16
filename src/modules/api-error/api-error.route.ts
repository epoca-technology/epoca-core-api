// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {ultraLowRiskLimit, mediumRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// API Error Service
import {IApiErrorService, IApiError} from './interfaces';
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Init Route
const ApiErrorRoute = express.Router();




/**
* Retrieves the full list of Api Errors.
* @requires id-token
* @requires api-secret
* @requires authority: 3
* @returns IAPIResponse<IApiError[]>
*/
/*ApiErrorRoute.route(`/getAll`).get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 3);

        // Perform Action
        const errors: IApiError[] = await _apiError.getAll();

        // Return the response
        res.send(_utils.apiResponse(errors));
    } catch (e) {
		console.log(e);
        _apiError.log('ApiErrorRoute.getAll', e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});*/





/**
* Deletes all API Errors that are currently stored.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param version
* @returns IAPIResponse<IApiError[]>
*/
ApiErrorRoute.route(`/deleteAll`).post(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, undefined, undefined, otp || '');

        // Perform Action
        await _apiError.deleteAll();

        // Retrieve the erros again
        const errors: IApiError[] = await _apiError.getAll();

        // Return the response
        res.send(_utils.apiResponse(errors));
    } catch (e) {
		console.log(e);
        _apiError.log('ApiErrorRoute.deleteAll', e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});






// Export Routes
export {ApiErrorRoute}

