// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from '../../ioc';


// Request Guard
import {highRiskLimit, ultraHighRiskLimit, IRequestGuardService} from '../request-guard';
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from '../utilities';
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// GUI Version Service
import {IGuiVersionService} from './interfaces';
const _version: IGuiVersionService = appContainer.get<IGuiVersionService>(SYMBOLS.GuiVersionService);


// Init Route
const GuiVersionRoute = express.Router();




/**
* Retrieves the current GUI Version
* @returns IAPIResponse<string>
*/
GuiVersionRoute.route(`/get`).get(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Perform Action
        const version: string = await _version.get();

        // Return the response
        res.send(_utils.apiResponse(version));
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
* Updates the current version.
* @param version
* @returns IAPIResponse<void>
*/
GuiVersionRoute.route(`/update`).post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Retrieve the token
    const token: string = req.get("authorization");

     try {
        // Validate the token
        // @TODO

        // Perform Action
        await _version.update(req.body.version);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        res.send(_utils.apiResponse(undefined, e));
    }
});






// Export Routes
export {GuiVersionRoute}

