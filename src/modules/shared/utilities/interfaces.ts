export interface IUtilitiesService {


    // Numbers
    calculateAverage(numberSeries: number[], decimalPlaces?: number): number,
    calculatePercentageChange(oldNumber: number, newNumber: number): number,

    // List Filtering
    filterList(list: any[], keyOrIndex: string|number): any[],

    // Error Handling
    getMessage(e: any): string,
}