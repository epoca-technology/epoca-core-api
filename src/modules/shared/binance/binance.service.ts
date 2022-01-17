import {inject, injectable} from "inversify";
import { IBinanceService, IBinanceCandlestickInterval, IBinanceCandlestick } from "./interfaces";
import { SYMBOLS } from "../../../ioc";
import { IUtilitiesService } from "../utilities";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";


@injectable()
export class BinanceService implements IBinanceService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;



    /**
     * The very first candlestick that can be retrieved through Binance's API.
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
        path += `&interval=${interval || '1m'}`;

        // Add the start time if provided
        if (startTime) path += `&startTime=${startTime}`;

        // Add the end time if provided
        if (endTime) path += `&endTime=${endTime}`;

        // Add the limit
        path += `&limit=${limit || 1000}`;

        // Build options
        const options: IExternalRequestOptions = {
            host: 'api.binance.com',
            path: path,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Retrieve the chainlock status
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the response
        // @TODO

        // Validate the data
        if (response.data && typeof response.data != "object") {
            console.log(response);
            throw new Error('Binance returned an invalid candlesticks series.');
        }

        // Return the series
        return response.data;
    }
}