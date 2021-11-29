
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
     * @param roundUp?
     * @returns number
     */
    public calculateAverage(numberSeries: number[], decimalPlaces?: number, roundUp?: boolean): number {
        // Init values
        let acum: BigNumber = new BigNumber(0);

        // Iterate over the numbers
        for (let n of numberSeries) { acum = acum.plus(n)}

        // Return the results
        return this.roundNumber(
            acum.dividedBy(numberSeries.length), 
            typeof decimalPlaces == "number" ? decimalPlaces: 2, 
            roundUp
        );
    }











    /**
     * Increases the number by a provided percent.
     * @param value 
     * @param percent 
     * @returns number
     */
     public increaseNumberByPercent(value: string|number|BigNumber, percent: number): number {
        return this.roundNumber(new BigNumber(percent).dividedBy(100).plus(1).times(value));
    }







    /**
     * Increases the number by a provided percent.
     * @param value 
     * @param percent 
     * @returns number
     */
     public decreaseNumberByPercent(value: string|number|BigNumber, percent: number): number {
        return this.roundNumber(new BigNumber(percent).dividedBy(100).minus(1).times(value).times(-1));
    }











    /**
     * Given an old and a new number, it will calculate the % difference between the 2.
     * @param oldNumber 
     * @param newNumber 
     * @param roundUp? 
     * @returns number
     */
    public calculatePercentageChange(oldNumber: number, newNumber: number, roundUp?: boolean): number {
        // Init result
        let change: BigNumber;

        // Handle an increase
        if (newNumber > oldNumber) {
            const increase: number = newNumber - oldNumber;
            change = new BigNumber(increase).dividedBy(oldNumber).times(100);
        } 
        
        // Handle a decrease
        else if (oldNumber > newNumber) {
            const decrease: number = oldNumber - newNumber;
            change = new BigNumber(decrease).dividedBy(oldNumber).times(100).times(-1);
        }

        // Handle the exact same value
        else {
            change = new BigNumber(0);
        }

        // Return the forecasted change
        return this.roundNumber(change, 2, roundUp);
    }











    /**
     * Given a number in any of the permited formats, it will round it based on provided params.
     * @param value 
     * @param decimalPlaces 
     * @param roundUp?
     * @returns 
     */
    public roundNumber(value: BigNumber|string|number, decimalPlaces: number = 2, roundUp?: boolean): number {
        // Check if it is a BigNumber instance
        if (BigNumber.isBigNumber(value)) {
            return value.decimalPlaces(decimalPlaces, this.getRoundingMode(roundUp)).toNumber();
        } else {
            return new BigNumber(value).decimalPlaces(decimalPlaces, this.getRoundingMode(roundUp)).toNumber();
        }
    }






    /**
     * Retrieves a rounding mode. Defaults to ROUND_DOWN
     * @param roundUp?
     * @returns BigNumber.RoundingMode
     */
    public getRoundingMode(roundUp?: boolean): BigNumber.RoundingMode {
        return roundUp == true ? BigNumber.ROUND_UP: BigNumber.ROUND_DOWN;
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
    public getErrorMessage(e: any): string {
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