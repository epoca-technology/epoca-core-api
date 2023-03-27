// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, highRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// API Error
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// State Services
import {
    IKeyZonesStateService, 
    IVolumeStateService, 
    ILiquidityStateService,
    ICoinsService,
    ICoinsSummary
} from "./interfaces";
const _vol: IVolumeStateService = appContainer.get<IVolumeStateService>(SYMBOLS.VolumeStateService);
const _liquidity: ILiquidityStateService = appContainer.get<ILiquidityStateService>(SYMBOLS.LiquidityService);
const _keyZones: IKeyZonesStateService = appContainer.get<IKeyZonesStateService>(SYMBOLS.KeyZonesStateService);
const _coins: ICoinsService = appContainer.get<ICoinsService>(SYMBOLS.CoinsService);


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



















/************************
 * Liquidity Retrievers *
 ************************/




/**
* Retrieves the full liquidity state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param currentPrice
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
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["currentPrice"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_liquidity.calculateState(Number(req.query.currentPrice))));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getLiquidityState", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});

















/***********************
 * KeyZones Management *
 ***********************/




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
        res.send(_utils.apiResponse(_keyZones.calculateState(undefined, true)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.calculateKeyZoneState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
* Retrieves the keyzones' configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IKeyZonesConfiguration>
*/
MarketStateRoute.route("/getKeyZonesConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_keyZones.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getKeyZonesConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the KeyZones.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateKeyZonesConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["newConfiguration"], req.body, otp || "");

        // Perform Action
        await _keyZones.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateKeyZonesConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});




















/********************
 * Coins Management *
 ********************/





/**
* Retrieves Coins Summary including all supported and installed coins
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ICoinsSummary>
*/
MarketStateRoute.route("/getCoinsSummary").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_coins.getCoinsSummary()));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getCoinsSummary", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
* Installs a coin into the system by symbol.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param symbol
* @returns IAPIResponse<ICoinsSummary>
*/
MarketStateRoute.route("/installCoin").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["symbol"], req.body, otp || "");

        // Perform Action
        const data: ICoinsSummary = await _coins.installCoin(req.body.symbol);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.installCoin", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});








/**
* Uninstalls a coin from the system by symbol.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param symbol
* @returns IAPIResponse<ICoinsSummary>
*/
MarketStateRoute.route("/uninstallCoin").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const otp: string = req.get("otp");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 4, ["symbol"], req.body, otp || "");

        // Perform Action
        const data: ICoinsSummary = await _coins.uninstallCoin(req.body.symbol);

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.uninstallCoin", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Retrieves the full state of a coin by symbol.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param symbol
* @returns IAPIResponse<ICoinState>
*/
MarketStateRoute.route("/getCoinFullState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["symbol"], req.query);

        // Return the response
        res.send(_utils.apiResponse(_coins.getCoinFullState(<string>req.query.symbol)));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getCoinFullState", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});










// Export Routes
export {MarketStateRoute}

