// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {lowRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from '../api-error';
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Candlestick Service
import {ICandlestickService, ICandlestick} from './interfaces';
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init Route
const CandlestickRoute = express.Router();




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
CandlestickRoute.route(`/getForPeriod`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
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









// Export Routes
export {CandlestickRoute}

