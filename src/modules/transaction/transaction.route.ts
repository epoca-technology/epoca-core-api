// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";



// Request Guard
import {IRequestGuardService, mediumRiskLimit, ultraHighRiskLimit, ultraLowRiskLimit} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);

// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Transaction Service
import { IAccountIncomeRecord, ITransactionService } from "../transaction";
const _tx: ITransactionService = appContainer.get<ITransactionService>(SYMBOLS.TransactionService);



// Init Route
const TransactionRoute = express.Router();














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
TransactionRoute.route("/syncBalance").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _tx.syncBalance();

        // Return the response
        res.send(_utils.apiResponse(_tx.balance));
    } catch (e) {
		console.log(e);
        _apiError.log("TransactionRoute.syncBalance", e, reqUid, ip, req.body);
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
TransactionRoute.route("/getBalance").get(mediumRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_tx.balance));
    } catch (e) {
		console.log(e);
        _apiError.log("TransactionRoute.getBalance", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});




















/**************************
 * Futures Account Income *
 **************************/





/**
 * Retrieves a list of income records based on given date range.
 * @requires id-token
 * @requires api-secret
 * @requires authority: 1
 * @param startAt
 * @param endAt
 * @returns IAPIResponse<IAccountIncomeRecord[]>
*/
TransactionRoute.route("/listIncomeRecords").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IAccountIncomeRecord[] = await _tx.listIncomeRecords(
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("TransactionRoute.listIncomeRecords", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
 * Syncs the futures account income records.
 * @requires id-token
 * @requires api-secret
 * @requires otp
 * @requires authority: 4
 * @returns IAPIResponse<void>
*/
TransactionRoute.route("/syncIncome").post(ultraHighRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, undefined, undefined, otp || "");

        // Perform Action without waiting for it
        _tx.syncIncome();

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("TransactionRoute.syncIncome", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});












// Export Routes
export {TransactionRoute}

