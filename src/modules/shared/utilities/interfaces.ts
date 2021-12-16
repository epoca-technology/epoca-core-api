import {BigNumber} from 'bignumber.js';




export interface IUtilitiesService {
    // Numbers
    calculateAverage(numberSeries: INumber[], config?: INumberConfig): INumber,
    alterNumberByPercentage(value: INumber, percent: number, config?: INumberConfig): INumber,
    calculatePercentageChange(oldNumber: INumber, newNumber: INumber, config?: INumberConfig): INumber,
    calculatePercentageOutOfTotal(value: INumber, total: INumber, config?: INumberConfig): INumber,
    calculateFee(value: INumber, feePercentage: number, config?: INumberConfig): INumber,
    outputNumber(value: INumber, config?: INumberConfig): INumber,

    // Dates
    toDateString(timestamp: number): string,

    // Error Handling
    getErrorMessage(e: any): string,

    // Async Delay
    asyncDelay(seconds: number): Promise<void>,
}





// Number Format
export type INumber = number|string|BigNumber;



// Number Config
export interface INumberConfig {
    outputFormat?: INumberOutputFormat,     // Defaults to 'string'
    decimalPlaces?: number,                 // Defaults to 2
    roundUp?: boolean,                      // Defaults to false
    roundingMode?: BigNumber.RoundingMode    // It's inserted in the service
}
export type INumberOutputFormat = 'number'|'string'|'BigNumber';





