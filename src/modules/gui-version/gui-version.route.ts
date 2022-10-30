// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraHighRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// GUI Version Service
import {IGuiVersionService} from "./interfaces";
const _version: IGuiVersionService = appContainer.get<IGuiVersionService>(SYMBOLS.GuiVersionService);


// Init Route
const GuiVersionRoute = express.Router();




/**
* Retrieves the current GUI Version
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<string>
* @DEPRECATED This route has been moved to BulkDataRoute.getAppBulk 
*/
/*GuiVersionRoute.route("/get").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Perform Action
        const version: string = await _version.get();

        // Return the response
        res.send(_utils.apiResponse(version));
    } catch (e) {
		console.log(e);
        _apiError.log("GuiVersionRoute.get", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});*/





/**
* Updates the current version.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param version
* @returns IAPIResponse<void>
*/
GuiVersionRoute.route("/update").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["version"], req.body, otp || "");

        // Perform Action
        await _version.update(req.body.version);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("GuiVersionRoute.update", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});






// Export Routes
export {GuiVersionRoute}

