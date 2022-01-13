

// Forecast Service
export interface IForecastService {
    forecast(start: number, end: number): Promise<IForecast>
}








// Forecast
export interface IForecast {
    position: IForecastPosition,
    data?: any  // RNNs like to talk?
}






// Forecast Position
export type IForecastPosition = 1|0|-1;