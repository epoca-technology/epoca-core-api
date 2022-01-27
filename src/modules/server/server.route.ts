// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';



// Rate Limit & Utilities
import {lowRiskLimit, IUtilitiesService, highRiskLimit, mediumRiskLimit} from '../shared/utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Server Service
import {IServerService} from '../server';
const _server: IServerService = appContainer.get<IServerService>(SYMBOLS.ServerService);



// Init Route
const ServerRoute = express.Router();







/* Retrievers */



/**
 * Retrieves the Server's Data. If it hasn't been initialized, the 
 * values will be the defaults.
* @returns IAPIResponse<IServerData>
*/
ServerRoute.route(`/getServerData`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

    try {
        // Validate the token
        // @TODO

        // Return the response
        res.send(_utils.apiResponse(_server.getServerData()));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});









/**
 * Retrieves the Server's Resources. If it hasn't been initialized, the 
 * values will be the defaults.
* @returns IAPIResponse<IServerResources>
*/
ServerRoute.route(`/getServerResources`).get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

    try {
        // Validate the token
        // @TODO

        // Return the response
        res.send(_utils.apiResponse(_server.getServerResources()));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});












/* Alarms Management */




/**
 * Updates the Server Alarms Configuration.
* @returns IAPIResponse<void>
*/
ServerRoute.route(`/setAlarmsConfiguration`).post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

    try {
        // Validate the token
        // @TODO

        // Perform Action
        await _server.setAlarmsConfiguration(req.body);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});















/* Essential Routes */



/**
 * Allows the GUI to verify that the server is running and can take requests.
 * @returns IAPIResponse<void>
 */
ServerRoute.route(`/status`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send(_utils.apiResponse());
});






/**
 * Allows the GUI to retrieve the current server time.
 * @returns IAPIResponse<number>
 */
 ServerRoute.route(`/time`).get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    res.send(_utils.apiResponse(Date.now()));
});




// Export Routes
export {ServerRoute}

