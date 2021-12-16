import { ICandlestickSeriesItem } from "../binance";
import { ICryptoCurrencySymbol } from "../cryptocurrency";




export interface ICandlestickService {




    // Candlesticks Proccessors
    processBinanceCandlesticks(symbol: ICryptoCurrencySymbol, candlesticks: ICandlestickSeriesItem[]): ICandlestick[],
}







// Candlestick Record
export interface ICandlestick {
    ot: number,                 // Open Time
    ct: number,                 // Close Time
    o: string,                  // Open Price
    h: string,                  // High Price
    l: string,                  // Low Price
    c: string,                  // Close Price
    v: string,                  // Volume (USDT)
    tbv: string,                // Taker Buy Volume (USDT)
    s?: ICryptoCurrencySymbol   // Cryptocurrency Symbol - Only present when adding the record to the db
}