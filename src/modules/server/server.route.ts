import express = require("express");

// Rate Limits
import {lowRiskLimit} from '../shared/rate-limit/rate.limit';

// Init Route
const ServerRoute = express.Router();




/**
 * Allows the GUI to verify that the server is running and can take requests.
 */
ServerRoute.route(`/status`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send({success:true, data: null, error: null});
});






/**
 * Allows the GUI to retrieve the current server time.
 */
 ServerRoute.route(`/time`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send({success:true, data: Date.now(), error: null});
});




// Export Routes
export {ServerRoute}

