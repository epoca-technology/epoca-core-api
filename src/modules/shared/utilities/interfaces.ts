import {BigNumber} from 'bignumber.js';


// Service
export interface IUtilitiesService {
    // Numbers
    calculateAverage(numberSeries: INumber[], config?: INumberConfig): INumber,
    alterNumberByPercentage(value: INumber, percent: INumber, config?: INumberConfig): INumber,
    calculatePercentageChange(oldNumber: INumber, newNumber: INumber, config?: INumberConfig): INumber,
    calculatePercentageOutOfTotal(value: INumber, total: INumber, config?: INumberConfig): INumber,
    calculateFee(value: INumber, feePercentage: INumber, config?: INumberConfig): INumber,
    outputNumber(value: INumber, config?: INumberConfig): INumber,

    // Dates
    getTimestamp(date: string): number,
    toDateString(timestamp: number): string,

    // Error Handling
    getErrorMessage(e: any): string,

    // Async Delay
    asyncDelay(seconds: number): Promise<void>,
}






/* Numbers */

// Number Format
export type INumber = number|string|BigNumber;



// Number Config
export interface INumberConfig {
    of?: INumberOutputFormat,    // Output Format: Defaults to 'n'
    dp?: number,                 // Decimal Places: Defaults to 2
    ru?: boolean,                // Round Up: Defaults to false
    rm?: BigNumber.RoundingMode  // Rounding Mode: It's inserted in the service
}
export type INumberOutputFormat = 'n'|'s'|'bn';





