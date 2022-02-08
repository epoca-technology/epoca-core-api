// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {lowRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

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
* @param start 
* @param end 
* @param intervalMinutes 
* @returns IAPIResponse<ICandlestick[]>
*/
CandlestickRoute.route(`/getForPeriod`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

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
        res.send(_utils.apiResponse(undefined, e));
    }
});









// Export Routes
export {CandlestickRoute}

