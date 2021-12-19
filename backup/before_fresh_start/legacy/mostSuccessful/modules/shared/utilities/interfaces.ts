import {BigNumber} from 'bignumber.js';


export interface IUtilitiesService {


    // Numbers
    calculateAverage(numberSeries: number[], decimalPlaces?: number, roundUp?: boolean): number,
    alterNumberByPercentage(value: string|number|BigNumber, percent: number, decimalPlaces?: number, roundUp?: boolean): number,
    calculatePercentageChange(oldNumber: number, newNumber: number, decimalPlaces?: number, roundUp?: boolean): number,
    getPercentageOutOfTotal(value: number, total: number, decimalPlaces?: number, roundUp?: boolean): number,
    calculateFee(value: number|BigNumber, feePercentage: number, decimalPlaces?: number, roundUp?: boolean): number,
    roundNumber(value: BigNumber|string|number, decimalPlaces?: number, roundUp?: boolean): number,
    getDecimalPlaces(decimalPlaces?: number): number,
    getRoundingMode(roundUp?: boolean): BigNumber.RoundingMode,

    // List Filtering
    filterList(list: any[], keyOrIndex: string|number, changeFormat?: IFilterListChangeFormat, decimalPlaces?: number): any[],

    // Dates
    toDateString(timestamp: number): string,

    // Error Handling
    getErrorMessage(e: any): string,

    // Async Delay
    asyncDelay(seconds: number): Promise<void>,
}




// Format changing
export type IFilterListChangeFormat = 'toString'|'toNumber';