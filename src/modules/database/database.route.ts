// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {highRiskLimit, IRequestGuardService, ultraHighRiskLimit} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from '../api-error';
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Database Service
import {IDatabaseService, IDatabaseSummary, IDatabaseBackupService} from './interfaces';
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);
const _dbBackup: IDatabaseBackupService = appContainer.get<IDatabaseBackupService>(SYMBOLS.DatabaseBackupService);


// Init Route
const DatabaseRoute = express.Router();




/**
 * Retrieves the Database Summary.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 5
 * @returns IAPIResponse<IDatabaseSummary>
*/
DatabaseRoute.route(`/getDatabaseSummary`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5);

        // Perform Action
        const summary: IDatabaseSummary = await _db.getDatabaseSummary();

        // Return the response
        res.send(_utils.apiResponse(summary));
    } catch (e) {
		console.log(e);
        _apiError.log('DatabaseRoute.getDatabaseSummary', e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});









/**
 * Retrieves the Database Summary.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 5
 * @returns IAPIResponse<IDatabaseSummary>
*/
DatabaseRoute.route(`/backupDatabase`).post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 5, undefined, undefined, otp || '');

        // Perform Action
        const something: any = await _dbBackup.backupDatabase();

        // Return the response
        res.send(_utils.apiResponse({something: something}));
    } catch (e) {
		console.log(e);
        _apiError.log('DatabaseRoute.getDatabaseSummary', e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







// Export Routes
export {DatabaseRoute}

