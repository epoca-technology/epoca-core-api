import {inject, injectable} from "inversify";
import { IBinanceService, ICandlestickSeriesInterval, ICandlestickSeries } from "./interfaces";
import { SYMBOLS } from "../../../ioc";
import { IUtilitiesService } from "../utilities";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { ICryptoCurrencySymbol } from "../cryptocurrency";


@injectable()
export class BinanceService implements IBinanceService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;



    constructor() {}


    











    /**
     * PUBLIC ENDPOINTS
     * No API Key is required for the following methods.
     * */










    /* Market Data */








    /**
     * Retrieves the candlesticks series accoring to params.
     * @param symbol
     * @param interval?      Defaults to 1m
     * @param startTime?     Defaults to undefined
     * @param endTime?       Defaults to undefined
     * @param limit?         Defaults to 1000
     * @returns Promise<ICandlestickSeries>
     */
    public async getCandlestickSeries(
        symbol: ICryptoCurrencySymbol, 
        interval?: ICandlestickSeriesInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<ICandlestickSeries> {
            // Build the path based on params
            let path: string = `/api/v3/klines?symbol=${symbol}USDT`;

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
            if (typeof response.data != "object" || !response.data.length) {
                console.log(response);
                throw new Error('Binance returned an invalid candlesticks series.');
            }

            // Return the series
            return response.data;
    }
}