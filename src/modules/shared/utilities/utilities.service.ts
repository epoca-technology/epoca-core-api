
import {injectable} from "inversify";
import { 
    IUtilitiesService, 
    INumber, 
    INumberConfig,
    IAPIResponse
} from "./interfaces";
import {BigNumber} from 'bignumber.js';
import * as moment from 'moment';





@injectable()
export class UtilitiesService implements IUtilitiesService {







    /* Numbers  */







    /**
     * Given a list of numbers, it will calculate the average.
     * @param numberSeries 
     * @param config?
     * @returns INumber
     */
    public calculateAverage(numberSeries: INumber[], config?: INumberConfig): INumber {
        // Init values
        let acum: BigNumber = new BigNumber(0);

        // Iterate over the numbers
        for (let n of numberSeries) { acum = acum.plus(n)}

        // Return the results
        return this.outputNumber(acum.dividedBy(numberSeries.length), config);
    }








    /**
     * Given a value and a percent change, it will detect if it has to be increased or 
     * decreased.
     * @param value 
     * @param percent 
     * @param config? 
     * @returns INumber
     */
    public alterNumberByPercentage(value: INumber, percent: INumber, config?: INumberConfig): INumber {
        // Init the new number
        let newNumber: BigNumber;
        let percentBN: BigNumber = this.getBigNumber(percent);

        // Handle an increase
        if (percentBN.isGreaterThan(0)) {
            newNumber = percentBN.dividedBy(100).plus(1).times(value);
        } 
        
        // Handle a decrease
        else if (percentBN.isLessThan(0)) {
            newNumber = percentBN.times(-1).dividedBy(100).minus(1).times(value).times(-1);
        }

        // Return the same value in case of 0%
        else {
            newNumber = this.getBigNumber(value);
        }

        // Return the new number
        return this.outputNumber(newNumber, config);
    }









    /**
     * Given an old and a new number, it will calculate the % difference between the 2.
     * @param oldNumber 
     * @param newNumber 
     * @param config?
     * @returns INumber
     */
    public calculatePercentageChange(oldNumber: INumber, newNumber: INumber, config?: INumberConfig): INumber {
        // Init values
        const oldBN: BigNumber = this.getBigNumber(oldNumber);
        const newBN: BigNumber = this.getBigNumber(newNumber);
        let change: BigNumber;

        // Handle an increase
        if (newBN.isGreaterThan(oldBN)) {
            const increase: BigNumber = newBN.minus(oldBN);
            change = increase.dividedBy(oldNumber).times(100);
        } 
        
        // Handle a decrease
        else if (oldBN.isGreaterThan(newBN)) {
            const decrease: BigNumber = oldBN.minus(newBN);
            change = decrease.dividedBy(oldNumber).times(100).times(-1);
        }

        // Handle the exact same value
        else {
            change = new BigNumber(0);
        }

        // Return the % change
        return this.outputNumber(change, config);
    }









    /**
     * Calculates the % represented by the value out of a total.
     * @param value 
     * @param total 
     * @param config?
     * @returns INumber
     */
     public calculatePercentageOutOfTotal(value: INumber, total: INumber, config?: INumberConfig): INumber {
        // Initialize the BigNumber Instance out of the value
        const bn: BigNumber = this.getBigNumber(value);

        // Calculate the % it represents
        return this.outputNumber(bn.times(100).dividedBy(total), config);
    }









    /**
     * Calculates the fee based on the value and the fee percentage.
     * @param value 
     * @param feePercentage 
     * @param config?
     * @returns INumber
     */
    public calculateFee(value: INumber, feePercentage: INumber, config?: INumberConfig): INumber {
        return this.outputNumber(this.getBigNumber(feePercentage).times(value).dividedBy(100), config);
    }










    /**
     * Given a value, it will adjust the decimal places and return it in the desired
     * format.
     * @param value 
     * @param config? 
     * @returns INumber
     */
    public outputNumber(value: INumber, config?: INumberConfig): INumber {
        // Init the config
        config = this.getConfig(config);

        // Retrieve the Big Number and set the decimal places
        const bn: BigNumber = this.getBigNumber(value).decimalPlaces(config.dp, config.rm);

        // Return the desired format
        switch(config.of) {
            case 's':
                return bn.toString();
            case 'n':
                return bn.toNumber();
            case 'bn':
                return bn;
            default:
                throw new Error(`The provided output format ${config.of} is invalid.`);
        }
    }








    
    /**
     * It will retrieve a BigNumber based on the value's format
     * @param value 
     * @returns BigNumber
     */
    public getBigNumber(value: INumber): BigNumber {
        if (BigNumber.isBigNumber(value)) { return value } else { return new BigNumber(value) }
    } 










    /**
     * Given the provided configuration, it will fill the parameters that weren't 
     * provided with defaults.
     * @param config 
     * @returns INumberConfig
     */
    private getConfig(config?: INumberConfig): INumberConfig {
        // Init the config
        config = config ? config: {};

        // Return the final
        return {
            dp: typeof config.dp == "number" ? config.dp: 2,
            rm: config.ru == true ? BigNumber.ROUND_UP: BigNumber.ROUND_DOWN,
            of: typeof config.of == "string" ? config.of: 'n'
        }
    }





























    /* API Response */







    /**
     * Builds a successful or unsuccesful API error object ready to be sent
     * back to the GUI.
     * @param data 
     * @param error 
     * @returns IAPIResponse
     */
    public apiResponse(data?: any, error?: string): IAPIResponse {
        return {
            success: error == undefined,
            data: data,
            error: error ? this.getErrorMessage(error): undefined
        }
    }









    /**
     * Given an error and a code, it will build an API error.
     * @param e 
     * @param code 
     * @returns string
     */
    public buildApiError(e: any, code?: number): string {
        return `${this.getErrorMessage(e)} {(${code || 0})}`;
    }






    /**
     * Given an API error, it will extract the error code. If none is found, will return 0
     * @param apiError 
     * @returns number
     */
    public getCodeFromApiError(error: string): number {
        // Make sure it is a valid string
        if (typeof error == "string" && error.length > 5) {
            // Extract the code
            const code: number = Number(error.substring(
                error.indexOf("{(") + 2, 
                error.lastIndexOf(")}")
            ));

            // If a code was found, return it
            if (code) return Number(code);
        }

        // If a code is not found, return 0 for 'unknown'
        return 0;
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
        else if (typeof e === "object" && e !== null && e !== undefined) {

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









    











    /* Dates */




    /**
     * Given a date in the following format '19/05/2020' it will return the timestamp.
     * @param date 
     * @returns number
     */
     public getTimestamp(date: string): number {
        return moment(date, ["DD-MM-YYYY"]).valueOf();
    }







    /**
     * Retrieves the date in a readable format.
     * @param timestamp 
     * @returns string
     */
    public toDateString(timestamp: number): string {
        return moment(timestamp).format("DD/MM/YYYY HH:mm:ss");
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