import { ITrendForecastResult } from "../../../src/modules/shared/trend-forecast";
import { ICandlestickTerm } from "../data/candlesticks";


// Class
export interface ITradingSimulation {
    run(): ITradingSimulationResult
}




// Class Config
export interface ITradingSimulationConfig {
    seriesTerm?: ICandlestickTerm,
    windowSize?: number,
    tendencyForecastRequired?: ITendencyForecastRequired,
    meditationMinutes?: number,
    takeProfit?: number,
    stopLoss?: number,
    verbose?: boolean
}
export interface ITendencyForecastRequired { long: 1|2,short: 1|2 }



// Result
export interface ITradingSimulationResult {
    // Identifier - To become a firebase key
    id: string,

    // Simulation Period
    periodBegins: number, // The open time of the first series item after the windowSize
    periodEnds: number,   // The close time of the last series item

    // List of all positions taken
    positions: ITradingSimulationPosition[],

    // Summary Counters
    successful: number,
    unsuccessful: number,
    neutral: number,
    whileMeditating: number,
    successRate: number,

    // Long Counters
    longsTotal: number,
    successfulLongs: number,
    unsuccessfulLongs: number,
    longSuccessRate: number,

    // Short Counters
    shortsTotal: number,
    successfulShorts: number,
    unsuccessfulShorts: number,
    shortSuccessRate: number,

    // Times
    start: number,
    end: number,
    duration: number
}




// Position Record
export interface ITradingSimulationPosition {
    // State
    //state: boolean,         // true = open, false = close

    // Type
    type: 'long'|'short',

    // Forecast Result
    forecast: ITrendForecastResult,

    // Open & Close times
    openTime: number,
    closeTime?: number,     // Populated once closed

    // Prices config
    openPrice: number,
    takeProfitPrice: number,
    stopLossPrice: number,

    /**
     * @closePrice?
     * This property is populated once the position is closed. It will take the value of 
     * @takeProfitPrice , @stopLossPrice or the last close price before the series ends.
     */
    closePrice?: number,

    // Outcome when the position is closed
    outcome?: boolean,      // true = successful, false = unsuccessful
}