import {BigNumber} from 'bignumber.js';


export interface IUtilitiesService {


    // Numbers
    calculateAverage(numberSeries: number[], decimalPlaces?: number, roundUp?: boolean): number,
    increaseNumberByPercent(value: string|number|BigNumber, percent: number): number,
    decreaseNumberByPercent(value: string|number|BigNumber, percent: number): number,
    calculatePercentageChange(oldNumber: number, newNumber: number, roundUp?: boolean): number,
    roundNumber(value: BigNumber|string|number, decimalPlaces: number, roundUp?: boolean): number,
    getRoundingMode(roundUp?: boolean): BigNumber.RoundingMode,

    // List Filtering
    filterList(list: any[], keyOrIndex: string|number, changeFormat?: IFilterListChangeFormat, decimalPlaces?: number): any[],

    // Error Handling
    getErrorMessage(e: any): string,
}




// Format changing
export type IFilterListChangeFormat = 'toString'|'toNumber';