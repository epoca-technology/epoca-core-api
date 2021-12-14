
import {injectable} from "inversify";
import { IUtilitiesService, IFilterListChangeFormat } from "./interfaces";
import {BigNumber} from 'bignumber.js';
import * as moment from 'moment';

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
        return this.roundNumber(acum.dividedBy(numberSeries.length), decimalPlaces, roundUp);
    }





    /**
     * Given a value and a percent change, it will detect if it has to be increased or 
     * decreased.
     * @param value 
     * @param percent 
     * @param decimalPlaces? 
     * @param roundUp? 
     * @returns number
     */
    public alterNumberByPercentage(value: string|number|BigNumber, percent: number, decimalPlaces?: number, roundUp?: boolean): number {
        // Handle an increase
        if (percent > 0) {
            return this.roundNumber(new BigNumber(percent).dividedBy(100).plus(1).times(value), decimalPlaces, roundUp);
        } 
        
        // Handle a decrease
        else {
            return this.roundNumber(new BigNumber(-(percent)).dividedBy(100).minus(1).times(value).times(-1), decimalPlaces, roundUp);
        }
    }









    /**
     * Given an old and a new number, it will calculate the % difference between the 2.
     * @param oldNumber 
     * @param newNumber 
     * @param decimalPlaces? 
     * @param roundUp? 
     * @returns number
     */
    public calculatePercentageChange(oldNumber: number, newNumber: number, decimalPlaces?: number, roundUp?: boolean): number {
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
        return this.roundNumber(change, decimalPlaces, roundUp);
    }







    /**
     * Calculates the % represented by the value out of a total.
     * @param value 
     * @param total 
     * @param decimalPlaces?
     * @param roundUp? 
     * @returns number
     */
    public getPercentageOutOfTotal(value: number, total: number, decimalPlaces?: number, roundUp?: boolean): number {
        return this.roundNumber(new BigNumber(value).times(100).dividedBy(total), decimalPlaces, roundUp);
    }









    /**
     * Calculates the fee based on the value and the fee percentage.
     * @param value 
     * @param feePercentage 
     * @param decimalPlaces?
     * @param roundUp? 
     * @returns number
     */
    public calculateFee(value: number|BigNumber, feePercentage: number, decimalPlaces?: number, roundUp?: boolean): number {
        return this.roundNumber(new BigNumber(feePercentage).times(value).dividedBy(100), decimalPlaces, roundUp);
    }








    /**
     * Given a number in any of the permited formats, it will round it based on provided params.
     * @param value 
     * @param decimalPlaces?
     * @param roundUp?
     * @returns number
     */
    public roundNumber(value: BigNumber|string|number, decimalPlaces?: number, roundUp?: boolean): number {
        // Check if it is a BigNumber instance
        if (BigNumber.isBigNumber(value)) {
            return value.decimalPlaces(this.getDecimalPlaces(decimalPlaces), this.getRoundingMode(roundUp)).toNumber();
        } else {
            return new BigNumber(value).decimalPlaces(this.getDecimalPlaces(decimalPlaces), this.getRoundingMode(roundUp)).toNumber();
        }
    }








    /**
     * Given a value, it will determine if it is a valid decimal place limit. Otherwise it will
     * return 2
     * @param decimalPlaces 
     * @returns number
     */
    public getDecimalPlaces(decimalPlaces?: number): number {
        return typeof decimalPlaces == "number" ? decimalPlaces: 2;
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
     * @param changeFormat 
     * @returns any[]
     */
    public filterList(list: any[], keyOrIndex: string|number, changeFormat?: IFilterListChangeFormat, decimalPlaces?: number): any[] {
        // Init the new list
        let filteredList: any[] = [];

        // Iterate over each item
        for (let item of list) {
            // Init the item's value
            let val: any = item[keyOrIndex];

            // Check if the format needs to be changed
            if (typeof changeFormat == "string" || typeof decimalPlaces == "number") {
                // Convert the value into a BigNumber Object
                val = new BigNumber(this.roundNumber(val, decimalPlaces));

                // Push the item based on the desired format
                if (changeFormat == 'toString') {
                    filteredList.push(val.toString());
                } else {
                    filteredList.push(val.toNumber());
                }
            } 
            
            // Otherwise, push the raw item
            else {
                filteredList.push(val);
            }
        }

        // Return the final list
        return filteredList;
    }







    /* Dates */







    /**
     * Retrieves the date in a readable format.
     * @param timestamp 
     * @returns string
     */
     public toDateString(timestamp: number): string {
        return moment(timestamp).format("DD/MM/YYYY HH:mm:ss");
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






    









    /* Async Delay */



    /**
     * It will create a promise that will resolve after provided seconds have passed.
     * This functionality is used to prevent our requests being blocked by external sources.
     * @param seconds 
     */
    public asyncDelay(seconds: number = 3): Promise<void> {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve();
            }, seconds * 1000);
        });
    }
}