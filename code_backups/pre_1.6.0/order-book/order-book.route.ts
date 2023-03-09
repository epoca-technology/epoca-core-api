// Dependencies
import express = require("express");
import {appContainer, SYMBOLS} from "../../ioc";


// Request Guard
import {ultraLowRiskLimit, IRequestGuardService} from "../request-guard";
const _guard: IRequestGuardService = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


// Utilities
import {IUtilitiesService} from "../utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// API Error Service
import {IApiErrorService} from "../api-error";
const _apiError: IApiErrorService = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Order Book Service
import {IOrderBookService, IOrderBook} from "./interfaces";
const _orderBook: IOrderBookService = appContainer.get<IOrderBookService>(SYMBOLS.OrderBookService);


// Init Route
const OrderBookRoute = express.Router();




/**
* Retrieves the latest order book state.
* @requires id-token
* @requires api-secret
* @requires authority: 1
* @returns IAPIResponse<IOrderBook|undefined>
*/
OrderBookRoute.route("/get").get(ultraLowRiskLimit, async (req: express.Request, res: express.Response) => {
    // Init values
    const idToken: string = req.get("id-token");
    const apiSecret: string = req.get("api-secret");
    const ip: string = req.clientIp;
    let reqUid: string;

    try {
        // Validate the request
        reqUid = await _guard.validateRequest(idToken, apiSecret, ip, 1);

        // Perform Action
        const book: IOrderBook|undefined = _orderBook.active.value;

        // Return the response
        res.send(_utils.apiResponse(book));
    } catch (e) {
		console.log(e);
        _apiError.log("OrderBookRoute.get", e, reqUid, ip);
        res.send(_utils.apiResponse(undefined, e));
    }
});











// Export Routes
export {OrderBookRoute}

