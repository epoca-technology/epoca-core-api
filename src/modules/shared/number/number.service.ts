import {injectable} from "inversify";
import { INumberService } from "./interfaces";
import {BigNumber} from 'bignumber.js';

@injectable()
export class NumberService implements INumberService {








    /**
     * Given a list of numbers, it will calculate the average.
     * @param numberSeries 
     * @param decimalPlaces?
     * @returns number
     */
    public calculateAverage(numberSeries: number[], decimalPlaces?: number): number {
        // Init values
        let acum: BigNumber = new BigNumber(0);

        // Iterate over the numbers
        for (let n of numberSeries) { acum = acum.plus(n)}

        // Return the results
        return acum
                .dividedBy(numberSeries.length)
                .decimalPlaces(typeof decimalPlaces == "number" ? decimalPlaces: 2)
                .toNumber();
    }









    /**
     * Given an old and a new number, it will calculate the % difference between the 2.
     * @param oldNumber 
     * @param newNumber 
     * @returns number
     */
    public calculatePercentageChange(oldNumber: number, newNumber: number): number {
        // Init result
        let change: number = 0;

        // Handle an increase
        if (newNumber > oldNumber) {
            const increase: number = newNumber - oldNumber;
            change = new BigNumber(increase).dividedBy(oldNumber).times(100).decimalPlaces(2).toNumber();
        } 
        
        // Handle a decrease
        else if (oldNumber > newNumber){
            const decrease: number = oldNumber - newNumber;
            change = new BigNumber(decrease).dividedBy(oldNumber).times(100).times(-1).decimalPlaces(2).toNumber();
        }

        // Return the forecasted change
        return change;
    }
}