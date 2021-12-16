import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick } from "./interfaces";
import { SYMBOLS } from "../../../ioc";
import { IUtilitiesService } from "../utilities";
import { ICandlestickSeriesItem } from "../binance";
import { ICryptoCurrencySymbol } from "../cryptocurrency";


@injectable()
export class CandlestickService implements ICandlestickService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    constructor() {}








    
    







    /* Candlesticks Proccessors */






    /**
     * Given a list of binance candlesticks, it will convert them into the correct format
     * in order to be stored in the db.
     * @param symbol 
     * @param candlesticks 
     * @returns ICandlestick[]
     */
    public processBinanceCandlesticks(symbol: ICryptoCurrencySymbol, candlesticks: ICandlestickSeriesItem[]): ICandlestick[] {
        // Init the list
        let list: ICandlestick[] = [];

        // Iterate over each candlestick and convert it into the proper format
        for (let c of candlesticks) {
            list.push({
                ot: c[0],
                ct: c[6],
                o: <string>this._utils.outputNumber(c[1], {decimalPlaces: 2}),
                h: <string>this._utils.outputNumber(c[2], {decimalPlaces: 2}),
                l: <string>this._utils.outputNumber(c[3], {decimalPlaces: 2}),
                c: <string>this._utils.outputNumber(c[4], {decimalPlaces: 2}),
                v: <string>this._utils.outputNumber(c[7], {decimalPlaces: 2}),
                tbv: <string>this._utils.outputNumber(c[10], {decimalPlaces: 2}),
                s: symbol
            });
        }

        // Return the final list
        return list;
    }
}