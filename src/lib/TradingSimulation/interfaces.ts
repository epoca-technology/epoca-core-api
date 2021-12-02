import { IForecastConfig, IForecastResult } from "../Forecast";
import { ICandlestickSeries, IVerbose } from "../../../src/types";
import {BigNumber} from "bignumber.js";


// Class
export interface ITradingSimulation {
    run(): ITradingSimulationResult
}



// Class Config
export interface ITradingSimulationConfig {
    series: ICandlestickSeries,
    forecastConfig: IForecastConfig,
    balanceConfig: IBalanceSimulationConfig,
    windowSize?: number,
    tendencyForecastRequired?: ITendencyForecastRequired,
    meditationMinutes?: number,
    takeProfit?: number,
    stopLoss?: number,
    verbose?: IVerbose
}
export interface ITendencyForecastRequired { long: 1|2,short: -1|-2 }









// Balance Class
export interface IBalanceSimulation {
    // Balance
    initial: number,
    current: number,
    bank: BigNumber,
    history: IBalanceHistory[],

    // Fees Summary
    fees: IBalanceSimulationAccumulatedFees,

    // Methods
    canOpenPosition(): void,
    onPositionClose(position: ITradingSimulationPosition): void
}

// Balance Config
export interface IBalanceSimulationConfig {
    initial: number,
    leverage?: number,
    borrowInterestPercent?: number,
    tradeFeePercent?: number,
    minimumPositionAmount?: number,
    verbose?: IVerbose,
}

// History
export interface IBalanceHistory {
    previous: number,
    current: number,
    difference: number,
    fee: IBalanceSimulationFees
}

// Fee Object
export interface IBalanceSimulationFees {
    netFee: number,
    borrowInterestFee: number,
    netTradesFee: number, // = openTradeFee + closeTradeFee
    openTradeFee: number,
    closeTradeFee: number,
}

// Accumulated Fee Object
export interface IBalanceSimulationAccumulatedFees {
    netFee: BigNumber,
    borrowInterestFee: BigNumber,
    netTradesFee: BigNumber,
    openTradeFee: BigNumber,
    closeTradeFee: BigNumber,
}








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

    /* Balance */

    // Summary
    initialBalance: number,
    currentBalance: number,
    bank: number,
    profit: number,

    // Fees
    netFee: number,
    borrowInterestFee: number,
    netTradesFee: number,
    openTradeFee: number,
    closeTradeFee: number,


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
    // Type
    type: 'long'|'short',

    // Forecast Result
    forecast: IForecastResult,

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