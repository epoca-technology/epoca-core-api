// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';
import { ICryptoCurrencySymbol } from "../shared/cryptocurrency";



// Rate Limit & Utilities
import {lowRiskLimit, IUtilitiesService} from '../shared/utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Candlestick Service
import {ICandlestickService, ICandlestick} from './interfaces';
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init Route
const CandlestickRoute = express.Router();




/**
 * Allows the GUI to verify that the server is running and can take requests.
* @param symbol 
* @param start 
* @param end 
* @param intervalMinutes 
* @returns ICandlestick[]
*/
CandlestickRoute.route(`/getForPeriod`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Retrieve the candlesticks
        const data: ICandlestick[] = await _candlestick.getForPeriod(
            <ICryptoCurrencySymbol>req.query.symbol, 
            Number(req.query.start), 
            Number(req.query.end), 
            Number(req.query.intervalMinutes)
        );

        // Return the response
        res.send(data);
    } catch (e) {
		console.log(e);
        res.status(500);
        res.json({ error: e });
    }
});









// Export Routes
export {CandlestickRoute}

