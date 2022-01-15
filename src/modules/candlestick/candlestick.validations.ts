import {inject, injectable} from "inversify";
import { ICandlestickValidations } from "./interfaces";
import { SYMBOLS } from "../../ioc";
import { IValidationsService } from "../shared/validations";


@injectable()
export class CandlestickValidations implements ICandlestickValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                   private _validations: IValidationsService;



    constructor() {}


    




    /**
     * Verifies if the provided params are valid in order to retrieve the
     * candlesticks for a given period.
     * @param start 
     * @param end 
     * @param intervalMinutes 
     * @returns void
     */
    public canGetForPeriod(start: number, end: number, intervalMinutes: number): void {
        // Make sure the start and the end are valid numbers
        if (!this._validations.numberValid(start) || !this._validations.numberValid(end)) {
            throw new Error(`The provided start and|or end timestamps are not valid numbers.`);
        }

        // Make sure the end is greater than the start
        if (start >= end) {
            throw new Error(`The end timestamp must be greater than the start timestamp.`);
        }

        // Make sure the interval is valid
        if (!this._validations.numberValid(intervalMinutes, 1, 5000)) {
            throw new Error(`The provided minutes interval is invalid.`);
        }
    }






}