// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';



// Rate Limit & Utilities
import {lowRiskLimit, IUtilitiesService} from '../shared/utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Candlestick Service
import {IForecastService, IForecastResult} from './interfaces';
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);


// Init Route
const ForecastRoute = express.Router();




/**
 * Allows the GUI to verify that the server is running and can take requests.
* @param start 
* @param end 
* @param zoneSize?
* @param zoneMergeDistanceLimit?
* @param priceActionCandlesticksRequirement?
* @returns IAPIResponse<IForecastResult>
*/
ForecastRoute.route(`/forecast`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Retrieve the forecast
        const data: IForecastResult = await _forecast.forecast(
            Number(req.query.start), 
            Number(req.query.end), 
            {
                priceActionCandlesticksRequirement: Number(req.query.priceActionCandlesticksRequirement) || undefined,
                includeCandlesticksInResponse: true
            },
            {
                zoneSize: Number(req.query.zoneSize) || undefined,
                zoneMergeDistanceLimit: Number(req.query.zoneMergeDistanceLimit) || undefined,
            }
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});









// Export Routes
export {ForecastRoute}

