
import {injectable} from "inversify";
import { IUtilitiesService } from "./interfaces";
import {BigNumber} from 'bignumber.js';

@injectable()
export class UtilitiesService implements IUtilitiesService {







    /* Numbers  */






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










    /* List Filtering */



    /**
     * Given a list and a key or an index, it will return the filtered version.
     * @param list 
     * @param keyOrIndex 
     * @returns any[]
     */
    public filterList(list: any[], keyOrIndex: string|number): any[] {
        let filteredList: any[] = [];
        for (let item of list) {
            filteredList.push(item[keyOrIndex]);
        }
        return filteredList
    }










    /* Error Handling */





    /**
     * Given an error, it will attempt to extract the message.
     * @param e 
     * @returns string
     */
    public getMessage(e: any): string {
        // Unknown error
        const unknownError: string = 'The error message could not be retrieved, find more information in the server logs.';

        // Handle String
        if (typeof e == "string") {
            return e;
        }

        // Handle object and deeper keys
        else if (typeof e === "object" && e !== null) {

            // Check if the message was provided
            if (typeof e.message == "string" && e.message.length) {
                return e.message;
            }

            // Otherwise, stringify the entire object
            return JSON.stringify(e);
        }

        // Unknown error
        else {
            console.log(e);
            return unknownError;
        }
    }
}