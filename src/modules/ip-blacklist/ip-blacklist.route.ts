// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {ultraLowRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from '../api-error';
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// IP Blacklist Service
import {IIPBlacklistService, IIPBlacklistRecord} from './interfaces';
const _blacklist: IIPBlacklistService = appContainer.get<IIPBlacklistService>(SYMBOLS.IPBlacklistService);


// Init Route
const IPBlacklistRoute = express.Router();





/**
 * Retrieves the list of currently blacklisted IPs.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 4
 * @returns IAPIResponse<IIPBlacklistRecord[]>
*/
IPBlacklistRoute.route(`/getAll`).get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4);

        // Perform Action
        const list: IIPBlacklistRecord[] = await _blacklist.getAll();

        // Return the response
        res.send(_utils.apiResponse(list));
    } catch (e) {
		console.log(e);
        _apiError.log('IPBlacklistRoute.getAll', e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
 * Registers an IP in the Blacklist and returns the updated list.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param ip
 * @param notes
 * @returns IAPIResponse<IIPBlacklistRecord[]>
*/
IPBlacklistRoute.route(`/registerIP`).post(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, ['ip'], req.body, otp || '');

        // Perform Action
        await _blacklist.registerIP(req.body.ip, req.body.notes);

        // Retrieve the new list
        const list: IIPBlacklistRecord[] = await _blacklist.getAll();

        // Return the response
        res.send(_utils.apiResponse(list));
    } catch (e) {
		console.log(e);
        _apiError.log('IPBlacklistRoute.registerIP', e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Updates a record's notes and returns the updated list.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param ip
 * @param newNotes
 * @returns IAPIResponse<IIPBlacklistRecord[]>
*/
IPBlacklistRoute.route(`/updateNotes`).post(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ['ip', 'newNotes'], req.body, otp || '');

        // Perform Action
        await _blacklist.updateNotes(req.body.ip, req.body.newNotes);

        // Retrieve the new list
        const list: IIPBlacklistRecord[] = await _blacklist.getAll();

        // Return the response
        res.send(_utils.apiResponse(list));
    } catch (e) {
		console.log(e);
        _apiError.log('IPBlacklistRoute.updateNotes', e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Unregisters an IP from the Blacklist and returns the updated list.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param ip
 * @returns IAPIResponse<IIPBlacklistRecord[]>
*/
IPBlacklistRoute.route(`/unregisterIP`).post(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ['ip'], req.body, otp || '');

        // Perform Action
        await _blacklist.unregisterIP(req.body.ip);

        // Retrieve the new list
        const list: IIPBlacklistRecord[] = await _blacklist.getAll();

        // Return the response
        res.send(_utils.apiResponse(list));
    } catch (e) {
		console.log(e);
        _apiError.log('IPBlacklistRoute.unregisterIP', e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});







// Export Routes
export {IPBlacklistRoute}

