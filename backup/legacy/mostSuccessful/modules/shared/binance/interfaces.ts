import { ICandlestickSeries } from "../../../types";


// Service
export interface IBinanceService {
    



    // PUBLIC ENDPOINTS


    // Market Data
    getCandlestickSeries(interval?: ICandlestickSeriesInterval, startTime?: number, endTime?: number, limit?:number): Promise<ICandlestickSeries>,

}







// Candlestick Series Intervals
export type ICandlestickSeriesInterval = '1m'|'3m'|'5m'|'15m'|'30m'|'1h'|'2h'|'4h'|'6h'|'8h'|'12h'|'1d'|'3d'|'1w'|'1M';