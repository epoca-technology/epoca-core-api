export interface IArimaService {
    forecastTendency(data: number[], fullPrices?: IArimaPrices): any,
    arima(data: number[], p: number, d: number, q: number): number,
    //autoArima(data: number[]): number,
    sarima(
        data: number[], 
        p?: number, 
        d?: number, 
        q?: number, 
        P?: number,
        D?: number,
        Q?: number,
        s?: number
    ): IArimaForecastedTendency,
    //sarimax(priceList: number[], timestampList: number[], p?: number, d?: number, q?: number): IArimaForecastedTendency,
    arimaAlt(data: IArimaPrices): IArimaForecastedTendency,
    nostradamus(numberSeries: number[]): any
}




export interface IArimaForecast {
    result: IArimaForecastedTendency,
    arima: IArimaForecastedTendency,
    sarima?: IArimaForecastedTendency,
    compactArima?: IArimaForecastedTendency,
    compactSarima?: IArimaForecastedTendency
}

export type IArimaForecastedTendency = -1|0|1;



export type IArimaPrices = IArimaPricesItem[];
export type IArimaPricesItem = [
    number, // Timestamp
    number  // Price
]