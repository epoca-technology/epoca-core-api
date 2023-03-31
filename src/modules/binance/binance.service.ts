import {inject, injectable} from "inversify";
import {stringify} from "querystring";
import * as crypto from "crypto";
import { SYMBOLS, environment } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { 
    IExternalRequestOptions, 
    IExternalRequestResponse, 
    IExternalRequestService 
} from "../external-request";
import { 
    IBinanceService, 
    IBinanceCandlestickInterval, 
    IBinanceCandlestick, 
    IBinanceBalance,
    IBinanceActivePosition,
    IBinanceTradeExecutionPayload,
    IBinancePositionActionSide,
    IBinancePositionSide,
    IBinanceOrderBook,
    IBinanceExchangeInformation,
    IBinanceCoinTicker
} from "./interfaces";


@injectable()
export class BinanceService implements IBinanceService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;



    /**
     * The very first candlestick that can be retrieved through Binance"s API.
     * Thursday, August 17, 2017 4:00:00 AM     - GMT
     * Thursday, August 17, 2017 12:00:00 AM    - Venezuela
     */
    public readonly candlestickGenesisTimestamp: number = 1502942400000;


    /**
     * Binance Credentials
     * In order to interact with Binance's API in behalf of an account,
     * the endpoints must contain a signature which ensures the request
     * is safe.
     */
    private readonly apiKey: string = environment.binance.apiKey;
    private readonly apiSecret: string = environment.binance.apiSecret;


    /**
     * Futures Base URL
     * The Futures API URL adjusts based on the environment of the process.
     * This base URL is used for account related operations.
     */
    private readonly futuresBaseURL: string = environment.production ? "fapi.binance.com": "testnet.binancefuture.com";




    constructor() {}













    /*****************************************************************************
     * FUTURES SIGNED ENDPOINTS                                                  *
     * Each request as well as its params must be signed prior to dispatching.   *
     *****************************************************************************/










    /* Retrievers */
    



    /**
     * Retrieves the current accounts' balances for a series
     * of assets. Make sure to filter all balances that aren't USDT.
     * @returns Promise<IBinanceBalance[]>
     */
    public async getBalances(): Promise<IBinanceBalance[]> {
        // Build options
        const params: string = this.buildSignedParamsString();
        const options: IExternalRequestOptions = {
            host: this.futuresBaseURL,
            path: `/fapi/v2/balance?${params}`,
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "X-MBX-APIKEY": this.apiKey
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the balances: ${this.extractErrorMessage(response)}`, 9));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid list of balances.", 10));
        }

        // Return the series
        return response.data;
    }








    /**
     * Retrieves the current active position. If none is active, returns
     * undefined
     * @returns Promise<IBinanceActivePosition[]>
     */
    public async getActivePositions(): Promise<IBinanceActivePosition[]> {
        // Build options
        const params: string = this.buildSignedParamsString();
        const options: IExternalRequestOptions = {
            host: this.futuresBaseURL,
            path: `/fapi/v2/positionRisk?${params}`,
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "X-MBX-APIKEY": this.apiKey
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the active positions: ${this.extractErrorMessage(response)}`, 11));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid list of active positions.", 12));
        }

        // Return the the active position (if any)
        return response.data.filter((p: IBinanceActivePosition) => Number(p.entryPrice) > 0);
    }















    /* Position Management */





    /**
     * Creates, increases or closes a position.
     * @param symbol
     * @param actionSide
     * @param positionSide
     * @param quantity
     * @returns Promise<IBinanceTradeExecutionPayload|undefined>
     */
     public async order(
        symbol: string,
        actionSide: IBinancePositionActionSide, 
        positionSide: IBinancePositionSide, 
        quantity: number
    ): Promise<IBinanceTradeExecutionPayload|undefined> {
        // Build options
        const params: string = this.buildSignedParamsString({
            symbol: symbol,
            side: actionSide,
            positionSide: positionSide,
            type: "MARKET",
            quantity: quantity
        });
        const options: IExternalRequestOptions = {
            host: this.futuresBaseURL,
            path: `/fapi/v1/order?${params}`,
            method: "POST",
            headers: {
                "Content-Type": "application/json;charset=utf-8",
                "X-MBX-APIKEY": this.apiKey
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when interacting with a position: ${this.extractErrorMessage(response)}`, 13));
        }

        // Return the series
        return response.data;
    }














    /* REQUEST SIGNER */


    /**
     * Given a parameters object, it will add the required properties,
     * convert it into a query string and sign it
     * @param rawParams 
     * @returns string
     */
    private buildSignedParamsString(rawParams?: any|undefined): string {
        // Init the current timestamp
        const timestamp: number = Date.now();

        // Init the params, if none were provided, initialize the requirements
        rawParams = rawParams ? rawParams: {};
        rawParams.recvWindow = 5000;
        rawParams.timestamp = timestamp;

        // Convert the params into a query string
        const queryString: string = stringify(rawParams);

        // Finally, sign and return the params
        const signedParams: string = crypto.createHmac("sha256", this.apiSecret).update(queryString).digest("hex");
        
        // Return the final query string
        return `${queryString}&signature=${signedParams}`;
    } 




    








    /****************************
     * FUTURES PUBLIC ENDPOINTS *
     ****************************/








    /**
     * Retrieves the full info object that contains all relevant data
     * for trading in Binance Futures.
     * @returns Promise<IBinanceExchangeInformation>
     */
    public async getExchangeInformation(): Promise<IBinanceExchangeInformation> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "fapi.binance.com",
            path: `/fapi/v1/exchangeInfo`,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the exchange info: ${this.extractErrorMessage(response)}`, 5));
        }

        // Validate the response's data
        if (
            !response.data || 
            typeof response.data != "object" || 
            !Array.isArray(response.data.symbols) || 
            !response.data.symbols.length
        ){
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid exchange information object.", 6));
        }

        // Return the series
        return response.data;
    }








    /**
     * Retrieves the tickers for all the supported coins in Binance Futures.
     * @returns Promise<IBinanceCoinTicker[]>
     */
    public async getCoinTickers(): Promise<IBinanceCoinTicker[]> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "fapi.binance.com",
            path: `/fapi/v1/ticker/24hr`,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the coin tickers: ${this.extractErrorMessage(response)}`, 7));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length){
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid list of coin tickers.", 8));
        }

        // Return the series
        return response.data;
    }
















    /*************************
     * SPOT PUBLIC ENDPOINTS * 
     *************************/






    /**
     * Retrieves the candlesticks series accoring to params.
     * @param interval?      Defaults to 1m
     * @param startTime?     Defaults to undefined
     * @param endTime?       Defaults to undefined
     * @param limit?         Defaults to 1000
     * @returns Promise<IBinanceCandlestick[]>
     */
    public async getCandlesticks(
        interval?: IBinanceCandlestickInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<IBinanceCandlestick[]> {
        // Build the path based on params
        let path: string = `/api/v3/klines?symbol=BTCUSDT`;

        // Add the interval
        path += `&interval=${interval || "1m"}`;

        // Add the start time if provided
        if (startTime) path += `&startTime=${startTime}`;

        // Add the end time if provided
        if (endTime) path += `&endTime=${endTime}`;

        // Add the limit
        path += `&limit=${limit || 1000}`;

        // Build options
        const options: IExternalRequestOptions = {
            host: "api.binance.com",
            path: path,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        // Retrieve the candlesticks
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the candlesticks series: ${this.extractErrorMessage(response)}`, 1));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid candlesticks series.", 2));
        }

        // Return the series
        return response.data;
    }





    

    /**
     * Retrieves the current order book state.
     * @returns Promise<IBinanceOrderBook>
     */
    public async getOrderBook(): Promise<IBinanceOrderBook> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "api.binance.com",
            path: `/api/v3/depth?symbol=BTCUSDT&limit=5000`,
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };

        // Retrieve the order book
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Binance returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the order book: ${this.extractErrorMessage(response)}`, 3));
        }

        // Validate the response's data
        if (
            !response.data || 
            typeof response.data != "object" || 
            !Array.isArray(response.data.bids) || 
            !Array.isArray(response.data.asks)
        ) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid order book.", 4));
        }

        // Return the series
        return response.data;
    }





















    /****************
     * Misc Helpers *
     ****************/






    /**
     * Given a response object, it will attempt to extract the error 
     * message returned by Binance.
     * @param res 
     * @returns string
     */
    private extractErrorMessage(res: IExternalRequestResponse|any): string {
        const defaultError: string = "The error message could not be extracted.";
        try {
            // If the value is a string, return it
            if (typeof res == "string" && res.length) return res;

            // If it is an object, check if the error message was included
            if (
                res && typeof res == "object" && 
                res.data && typeof res.data == "object" &&
                typeof res.data.msg == "string"
            ) {
                return `${res.data.msg} (${typeof res.data.code == 'number' ? res.data.code: 0})`;
            }

            // Otherwise, return the default error
            return defaultError;
        } catch (e) {
            console.log(e);
            return defaultError;
        }
    }
}