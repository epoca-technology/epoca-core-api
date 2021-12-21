// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';



// Rate Limit & Utilities
import {lowRiskLimit, IUtilitiesService} from '../shared/utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




// Init Route
const ServerRoute = express.Router();




/**
 * Allows the GUI to verify that the server is running and can take requests.
 * @returns {success: boolean}
 */
ServerRoute.route(`/status`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send({success: true});
});






/**
 * Allows the GUI to retrieve the current server time.
 * @returns {ts: number}
 */
 ServerRoute.route(`/time`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send({ts: Date.now()});
});




// Export Routes
export {ServerRoute}

