// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';



// Rate Limit & Utilities
import {highRiskLimit, ultraHighRiskLimit, IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Database Service
import {IDatabaseService, IDatabaseSummary} from './interfaces';
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);


// Init Route
const DatabaseRoute = express.Router();




/**
 * Retrieves the Database Summary.
* @returns IAPIResponse<IDatabaseSummary>
*/
DatabaseRoute.route(`/getDatabaseSummary`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Perform Action
        const summary: IDatabaseSummary = await _db.getDatabaseSummary();

        // Return the response
        res.send(_utils.apiResponse(summary));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});









// Export Routes
export {DatabaseRoute}

