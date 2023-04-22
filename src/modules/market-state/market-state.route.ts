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
    ICoinsSummary,
    IWindowStateService,
    ITrendStateService,
    IKeyZoneStateEvent,
    IKeyZoneFullState,
    IReversalService,
    IReversalState,
    IReversalCoinsStates
} from "./interfaces";
const _window: IWindowStateService = appContainer.get<IWindowStateService>(SYMBOLS.WindowStateService);
const _vol: IVolumeStateService = appContainer.get<IVolumeStateService>(SYMBOLS.VolumeStateService);
const _liquidity: ILiquidityStateService = appContainer.get<ILiquidityStateService>(SYMBOLS.LiquidityService);
const _keyZones: IKeyZonesStateService = appContainer.get<IKeyZonesStateService>(SYMBOLS.KeyZonesStateService);
const _trend: ITrendStateService = appContainer.get<ITrendStateService>(SYMBOLS.TrendStateService);
const _coins: ICoinsService = appContainer.get<ICoinsService>(SYMBOLS.CoinsService);
const _reversal: IReversalService = appContainer.get<IReversalService>(SYMBOLS.ReversalService);


// Init Route
const MarketStateRoute = express.Router();
















/*********************
 * Window Management *
 *********************/







/**
* Retrieves the window's configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IWindowStateConfiguration>
*/
MarketStateRoute.route("/getWindowConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_window.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getWindowConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the Window.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateWindowConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _window.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateWindowConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});
















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






















/**************************
 * Trend State Management *
 **************************/







/**
* Retrieves the trend's configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ITrendStateConfiguration>
*/
MarketStateRoute.route("/getTrendConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_trend.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getTrendConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the Trend.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateTrendConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _trend.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateTrendConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});























/************************
 * Liquidity Management *
 ************************/





/**
* Retrieves the full liquidity state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IFullLiquidityState>
*/
MarketStateRoute.route("/getFullLiquidityState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
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
        _apiError.log("MarketStateRoute.getFullLiquidityState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Retrieves the liquidity's configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ILiquidityConfiguration>
*/
MarketStateRoute.route("/getLiquidityConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_liquidity.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getLiquidityConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the Liquidity.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateLiquidityConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _liquidity.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateLiquidityConfiguration", e, reqUid, ip, req.body);
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
        res.send(_utils.apiResponse(<IKeyZoneFullState>_keyZones.calculateState()));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.calculateKeyZoneState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});









/**
* Retrieves the full keyzone state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param startAt
* @param endAt
* @returns IAPIResponse<IKeyZoneStateEvent[]>
*/
MarketStateRoute.route("/listKeyZoneEvents").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, ["startAt", "endAt"], req.query);

        // Retrieve the data
        const data: IKeyZoneStateEvent[] = await _keyZones.listKeyZoneEvents(
            Number(req.query.startAt),
            Number(req.query.endAt)
        );

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.listKeyZoneEvents", e, reqUid, ip, req.query);
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






/**
* Retrieves the compressed state for all the installed coins.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ICoinsCompressedState>
*/
MarketStateRoute.route("/getCoinsCompressedState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_coins.getCoinsCompressedState()));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getCoinsCompressedState", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});










/**
* Retrieves the coins's configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<ICoinsConfiguration>
*/
MarketStateRoute.route("/getCoinsConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_coins.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getCoinsConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the Coins.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateCoinsConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _coins.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateCoinsConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});


















/***********************
 * Reversal Management *
 ***********************/






/**
* Retrieves the reversal's state by id
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param id
* @returns IAPIResponse<IReversalState>
*/
MarketStateRoute.route("/getReversalState").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, [ "id" ], req.query);

        // Retrieve the data
        const data: IReversalState = await _reversal.getReversalState(Number(req.query.id));

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getReversalState", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});





/**
* Retrieves the reversal's coins states by id
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @param id
* @returns IAPIResponse<IReversalCoinsStates>
*/
MarketStateRoute.route("/getReversalCoinsStates").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1, [ "id" ], req.query);

        // Retrieve the data
        const data: IReversalCoinsStates = await _reversal.getReversalCoinsStates(Number(req.query.id));

        // Return the response
        res.send(_utils.apiResponse(data));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getReversalCoinsStates", e, reqUid, ip, req.query);
        res.send(_utils.apiResponse(undefined, e));
    }
});






/**
* Retrieves the reversal's configuration
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IReversalConfiguration>
*/
MarketStateRoute.route("/getReversalConfiguration").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Return the response
        res.send(_utils.apiResponse(_reversal.config));
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.getReversalConfiguration", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});







/**
* Updates the configuration of the Reversal.
* @requires id-token
* @requires api-secret
* @requires otp
* @requires authority: 4
* @param newConfiguration
* @returns IAPIResponse<void>
*/
MarketStateRoute.route("/updateReversalConfiguration").post(highRiskLimit, async (req: express.Request, res: express.Response) => {
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
        await _reversal.updateConfiguration(req.body.newConfiguration);

        // Return the response
        res.send(_utils.apiResponse());
    } catch (e) {
		console.log(e);
        _apiError.log("MarketStateRoute.updateReversalConfiguration", e, reqUid, ip, req.body);
        res.send(_utils.apiResponse(undefined, e));
    }
});














// Export Routes
export {MarketStateRoute}

