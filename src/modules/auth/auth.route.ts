// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {highRiskLimit, ultraHighRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Database Service
import {IAuthService} from './interfaces';
const _auth: IAuthService = appContainer.get<IAuthService>(SYMBOLS.AuthService);


// Init Route
const AuthRoute = express.Router();




/**
* Retrieves the current GUI Version
* @returns IAPIResponse<string>
*/
AuthRoute.route(`/get`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Perform Action
        // @TODO

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});









// Export Routes
export {AuthRoute}

