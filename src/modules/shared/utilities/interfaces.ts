import {BigNumber} from 'bignumber.js';


export interface IUtilitiesService {


    // Numbers
    calculateAverage(numberSeries: INumber[], decimalPlaces?: number, roundUp?: boolean): number,
    alterNumberByPercentage(value: INumber, percent: number, decimalPlaces?: number, roundUp?: boolean): number,
    calculatePercentageChange(oldNumber: INumber, newNumber: INumber, decimalPlaces?: number, roundUp?: boolean): number,
    calculatePercentageOutOfTotal(value: INumber, total: INumber, decimalPlaces?: number, roundUp?: boolean): number,
    calculateFee(value: INumber, feePercentage: number, decimalPlaces?: number, roundUp?: boolean): number,
    roundNumber(value: INumber, decimalPlaces?: number, roundUp?: boolean): number,
    getDecimalPlaces(decimalPlaces?: number): number,
    getRoundingMode(roundUp?: boolean): BigNumber.RoundingMode,
    getBigNumber(value: INumber): BigNumber,

    // List Filtering
    filterList(list: any[], keyOrIndex: string|number, changeFormat?: IFilterListChangeFormat, decimalPlaces?: number, roundUp?: boolean): any[],

    // Dates
    toDateString(timestamp: number): string,

    // Error Handling
    getErrorMessage(e: any): string,

    // Async Delay
    asyncDelay(seconds: number): Promise<void>,
}





// Number Format
export type INumber = number|string|BigNumber;



// Format changing
export type IFilterListChangeFormat = 'toString'|'toNumber';


