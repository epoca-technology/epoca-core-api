// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Technical Analysis Service
import {ITAIntervalID, ITechnicalAnalysisStateService} from "./interfaces";
const _ta: ITechnicalAnalysisStateService = appContainer.get<ITechnicalAnalysisStateService>(SYMBOLS.TechnicalAnalysisStateService);


// Init Route
const MarketStateRoute = express.Router();






/* Technical Analysis Retrievers */



/**
* Retrieves the state for a provided technical analysis interval.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param epochID 
* @returns IAPIResponse<ITAIntervalState>
*/
MarketStateRoute.route("/getTAIntervalState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["intervalID"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_ta.getIntervalState(<ITAIntervalID>req.query.intervalID)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getTAIntervalState", e, reqUid, ip, {intervalID: req.query.intervalID});
        res.send(_utils.apiResponse(undefined, e));
    }
});










// Export Routes
export {MarketStateRoute}

