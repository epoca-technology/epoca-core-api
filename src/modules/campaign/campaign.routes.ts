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
import {
    ICampaignConfigurationsSnapshot,
    ICampaignHeadline,
    ICampaignNote, 
    ICampaignService, 
    ICampaignSummary,
    IShareHolderTransaction
} from "../campaign";
const _campaign: ICampaignService = appContainer.get<ICampaignService>(SYMBOLS.CampaignService);



// Init Route
const CampaignRoute = express.Router();












/**********************
 * General Retrievers *
 **********************/






/**
 * Retrieves all the notes belonging to a campaign based on its id.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param campaignID
 * @returns IAPIResponse<ICampaignSummary>
*/
CampaignRoute.route("/getCampaignSummary").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["campaignID"], req.query);

        // Retrieve the data
        const data: ICampaignSummary = await _campaign.getCampaignSummary(<string>req.query.campaignID);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.getCampaignSummary", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Retrieves the configurations snapshot for a campaign.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param campaignID
 * @returns IAPIResponse<ICampaignConfigurationsSnapshot>
*/
CampaignRoute.route("/getConfigurationsSnapshot").get(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["campaignID"], req.query);

        // Retrieve the data
        const data: ICampaignConfigurationsSnapshot = await _campaign.getConfigurationsSnapshot(<string>req.query.campaignID);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.getConfigurationsSnapshot", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
 * Retrieves the list of campaign headlines.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param start 
 * @param end 
 * @returns IAPIResponse<ICampaignHeadline[]>
*/
CampaignRoute.route("/listHeadlines").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["start", "end"], req.query);

        // Retrieve the data
        const data: ICampaignHeadline[] = await _campaign.listHeadlines(
            Number(req.query.start), 
            Number(req.query.end)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log('CampaignRoute.listHeadlines', e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Retrieves the list of campaign headlines.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param start 
 * @param end 
 * @returns IAPIResponse<IShareHolderTransaction[]>
*/
CampaignRoute.route("/listShareHolderTransactions").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["start", "end"], req.query);

        // Retrieve the data
        const data: IShareHolderTransaction[] = await _campaign.listShareHolderTransactions(
            reqUid,
            Number(req.query.start), 
            Number(req.query.end)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log('CampaignRoute.listShareHolderTransactions', e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});
























/*****************************
 * Campaign Notes Management *
 *****************************/




/**
 * Saves a note belonging to a campaign based on its ID and returns the updated
 * list once the note has been saved.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @param campaignID
 * @param title
 * @param description
 * @returns IAPIResponse<ICampaignNote[]>
*/
CampaignRoute.route("/saveNote").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["campaignID", "title", "description"], req.body, otp || "");

        // Perform Action
        const data: ICampaignNote[] = await _campaign.saveNote(
            req.body.campaignID,
            req.body.title,
            req.body.description
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.saveNote", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
 * Retrieves all the notes belonging to a campaign based on its id.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 2
 * @param campaignID
 * @returns IAPIResponse<ICampaignNote[]>
*/
CampaignRoute.route("/listNotes").get(lowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 2, ["campaignID"], req.query);

        // Retrieve the data
        const data: ICampaignNote[] = await _campaign.listNotes(<string>req.query.campaignID);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.listNotes", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});




















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




















/**************************
 * Futures Account Income *
 **************************/





/**
 * Syncs the futures account income records.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @returns IAPIResponse<void>
*/
CampaignRoute.route("/syncIncome").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _campaign.syncIncome();

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("CampaignRoute.syncIncome", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});












// Export Routes
export {CampaignRoute}

