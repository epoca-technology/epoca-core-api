import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
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
    IBinanceOrderBook, 
    IBinanceOpenInterest,
    IBinanceLongShortRatio
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




    constructor() {}


    











    /**
     * PUBLIC ENDPOINTS
     * No API Key is required for the following methods.
     * */










    /* Market Data */






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
            when retrieving the candlesticks series.`, 1));
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
     * @param limit?  -> Defaults to 50
     * @returns Promise<IBinanceOrderBook>
     */
     public async getOrderBook(limit?: number): Promise<IBinanceOrderBook> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "fapi.binance.com",
            path: `/fapi/v1/depth?symbol=BTCUSDT&limit=${limit || 50}`,
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
            when retrieving the order book.`, 3));
        }

        // Validate the response's data
        if (!response.data || typeof response.data != "object" || !Array.isArray(response.data.bids) || !Array.isArray(response.data.asks)) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid order book.", 4));
        }

        // Return the series
        return response.data;
    }







    /**
     * Retrieves the last 32 hours worth of open interest from
     * Binance's API.
     * @returns Promise<IBinanceOpenInterest[]>
     */
     public async getOpenInterest(): Promise<IBinanceOpenInterest[]> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "fapi.binance.com",
            path: `/futures/data/openInterestHist?symbol=BTCUSDT&period=30m&limit=64`,
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
            when retrieving the open interest.`, 5));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid open interest list.", 6));
        }

        // Return the series
        return response.data;
    }








    /* Long/Short Ratio */




    /**
     * Retrieves the last 32 hours worth of long/short ratio from
     * Binance's API.
     * @returns Promise<IBinanceLongShortRatio[]>
     */
     public async getLongShortRatio(): Promise<IBinanceLongShortRatio[]> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "fapi.binance.com",
            path: `/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=30m&limit=64`,
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
            when retrieving the long short ratio.`, 7));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Binance returned an invalid long short ratio list.", 8));
        }

        // Return the series
        return response.data;
    }
}