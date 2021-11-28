export interface INumberService {
    calculateAverage(numberSeries: number[], decimalPlaces?: number): number,
    calculatePercentageChange(oldNumber: number, newNumber: number): number
}