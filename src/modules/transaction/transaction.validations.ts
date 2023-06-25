import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { ITransactionValidations} from "./interfaces";




@injectable()
export class TransactionValidations implements ITransactionValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;




    constructor() {}








    /**
     * Ensures a given date range is valid for db queries.
     * @param startAt 
     * @param endAt 
     */
    public validateDateRange(startAt: number, endAt: number): void {
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The provided date range is invalid.`, 39000));
        }
        if (endAt <= startAt) {
            throw new Error(this._utils.buildApiError(`The end of the query must be greater than the beginning.`, 39001));
        }
    }
}
