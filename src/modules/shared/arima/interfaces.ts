export interface IArimaService {
    arima(data: number[], p?: number, d?: number, q?: number): number,
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
    ): number
}




