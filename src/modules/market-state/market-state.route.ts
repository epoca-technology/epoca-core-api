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


// State Services
import {
    ITAIntervalID, 
    ITechnicalAnalysisStateService, 
    IKeyZonesStateService, 
    IVolumeStateService, 
    IExchangeOpenInterestID,
    IOpenInterestStateService,
    ILongShortRatioStateService,
    IExchangeLongShortRatioID,
    ILiquidityStateService
} from "./interfaces";
const _vol: IVolumeStateService = appContainer.get<IVolumeStateService>(SYMBOLS.VolumeStateService);
const _ta: ITechnicalAnalysisStateService = appContainer.get<ITechnicalAnalysisStateService>(SYMBOLS.TechnicalAnalysisStateService);
const _liquidity: ILiquidityStateService = appContainer.get<ILiquidityStateService>(SYMBOLS.LiquidityService);
const _keyZones: IKeyZonesStateService = appContainer.get<IKeyZonesStateService>(SYMBOLS.KeyZonesStateService);
const _openInterest: IOpenInterestStateService = appContainer.get<IOpenInterestStateService>(SYMBOLS.OpenInterestStateService);
const _longShortRatio: ILongShortRatioStateService = appContainer.get<ILongShortRatioStateService>(SYMBOLS.LongShortRatioStateService);


// Init Route
const MarketStateRoute = express.Router();






/*********************
 * Volume Retrievers *
 *********************/



/**
* Retrieves the full volume state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IVolumeState>
*/
MarketStateRoute.route("/getFullVolumeState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_vol.state));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getFullVolumeState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});















/*********************************
 * Technical Analysis Retrievers *
 *********************************/



/**
* Retrieves the state for a provided technical analysis interval.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param intervalID 
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












/************************
 * Liquidity Retrievers *
 ************************/




/**
* Retrieves the full liquidity state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ILiquidityState>
*/
MarketStateRoute.route("/getLiquidityState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_liquidity.state));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getLiquidityState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});

















/**********************
 * KeyZone Retrievers *
 **********************/




/**
* Retrieves the full keyzone state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IKeyZoneFullState>
*/
MarketStateRoute.route("/calculateKeyZoneState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_keyZones.calculateState(true)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.calculateKeyZoneState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});












/****************************
 * Open Interest Retrievers *
 ****************************/



/**
* Retrieves the open interest state for a given exchange id.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param exchangeID 
* @returns IAPIResponse<IExchangeOpenInterestState>
*/
MarketStateRoute.route("/getOpenInterestStateForExchange").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["exchangeID"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_openInterest.getExchangeState(<IExchangeOpenInterestID>req.query.exchangeID)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getOpenInterestStateForExchange", e, reqUid, ip, {exchangeID: req.query.exchangeID});
        res.send(_utils.apiResponse(undefined, e));
    }
});














/*******************************
 * Long/Short Ratio Retrievers *
 *******************************/



/**
* Retrieves the long/short ratio state for a given exchange id.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param exchangeID 
* @returns IAPIResponse<IExchangeLongShortRatioState>
*/
MarketStateRoute.route("/getLongShortRatioStateForExchange").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["exchangeID"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_longShortRatio.getExchangeState(<IExchangeLongShortRatioID>req.query.exchangeID)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getLongShortRatioStateForExchange", e, reqUid, ip, {exchangeID: req.query.exchangeID});
        res.send(_utils.apiResponse(undefined, e));
    }
});







// Export Routes
export {MarketStateRoute}

