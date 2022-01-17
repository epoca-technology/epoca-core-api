

// Service
export interface IBinanceService {
    



    // PUBLIC ENDPOINTS


    // Market Data
    getCandlesticks(
        interval?: IBinanceCandlestickInterval, 
        startTime?: number, 
        endTime?: number, 
        limit?:number
    ): Promise<IBinanceCandlestick[]>,

}







// Candlestick Series Intervals
export type IBinanceCandlestickInterval = '1m'|'3m'|'5m'|'15m'|'30m'|'1h'|'2h'|'4h'|'6h'|'8h'|'12h'|'1d'|'3d'|'1w'|'1M';




// Candlesticks
export type IBinanceCandlestick = [
    number,     // 0 = Open time.                       Ej: 1638122400000
    string,     // 1 = Open.                            Ej: "53896.36000000"
    string,     // 2 = High.                            Ej: "54186.17000000"
    string,     // 3 = Low.                             Ej: "53256.64000000"
    string,     // 4 = Close                            Ej: "54108.99000000"
    string,     // 5 = Volume                           Ej: "2958.13310000"
    number,     // 6 = Close time                       Ej: 1638125999999
    string,     // 7 = Quote asset volume               Ej: "158995079.39633250"
    number,     // 8 = Number of trades                 Ej: 90424
    string,     // 9 = Taker buy base asset volume      Ej: "1473.57777000"
    string,     // 10 = Taker buy quote asset volume    Ej: "79236207.41530900"
    string      // Ignore.
]