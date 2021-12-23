import {injectable} from "inversify";
import { ICryptoCurrencySymbol } from ".";
import { ICryptoCurrencyService, ICryptoCurrencyData } from "./interfaces";


@injectable()
export class CryptoCurrencyService implements ICryptoCurrencyService {
    // Inject dependencies

    // Currency Data
    public readonly data: ICryptoCurrencyData = {
        BTC: {
            symbol: 'BTC',
            name: 'Bitcoin',
            genesisCandlestick: 1502942400000
        },
        ETH: {
            symbol: 'ETH',
            name: 'Ethereum',
            genesisCandlestick: 1502942400000
        }
    };


    // Symbol List
    public readonly symbols: ICryptoCurrencySymbol[] = <ICryptoCurrencySymbol[]>Object.keys(this.data);



    constructor() {}








    
    

}