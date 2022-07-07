

// Forecast Service
export interface IPredictionService {
    initialize(): Promise<void>,
    stop(): void,
    predict(): Promise<any>
}






