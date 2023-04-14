// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";



// Request Guard
import {IRequestGuardService, lowRiskLimit, mediumRiskLimit, ultraHighRiskLimit, ultraLowRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Campaign Service
import {ICampaignService} from "../campaign";
const _campaign: ICampaignService = appContainer.get<ICampaignService>(SYMBOLS.CampaignService);



// Init Route
const CampaignRoute = express.Router();





























/***************************
 * Futures Account Balance *
 ***************************/







/**
 * Syncs the futures account balance and retrieves the updated version.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @returns IAPIResponse<IAccountBalance>
*/
CampaignRoute.route("/syncBalance").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, undefined, undefined, otp || "");

        // Perform Action
        await _campaign.syncBalance();

        // Return the response
        res.send(_utils.apiResponse(_campaign.balance));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.syncBalance", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});









/**
 * Retrieves the account's balance in the futures wallet.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @returns IAPIResponse<IAccountBalance>
*/
CampaignRoute.route("/getBalance").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_campaign.balance));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.getBalance", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});






















// Export Routes
export {CampaignRoute}

