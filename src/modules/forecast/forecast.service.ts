import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../shared/utilities";
import { 
    IForecastResult, 
    IForecastService, 
    ITendencyForecast 
} from "./interfaces";
import {BigNumber} from "bignumber.js";



@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;






    constructor() {}






    /**
     * Given a series of 1m candlesticks, it will predict the next position to be taken.
     * @param series 
     * @returns Promise<IForecastResult>
     */
    public async forecast(candlesticks1m: ICandlestick[]): Promise<IForecastResult> {
        return Math.random() > 0.5 ? {result: 1}: {result: -1};
    }



    








}