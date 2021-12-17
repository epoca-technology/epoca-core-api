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
        },
        BNB: {
            symbol: 'BNB',
            name: 'Binance Coin',
            genesisCandlestick: 1509940440000
        },
        SOL: {
            symbol: 'SOL',
            name: 'Solana',
            genesisCandlestick: 1597125600000
        },
        ADA: {
            symbol: 'ADA',
            name: 'Cardano',
            genesisCandlestick: 1523937720000
        },
    };


    // Symbol List
    //public readonly symbols: ICryptoCurrencySymbol[] = <ICryptoCurrencySymbol[]>Object.keys(this.data);
    public readonly symbols: ICryptoCurrencySymbol[] = ['BTC'];



    constructor() {}








    
    

}