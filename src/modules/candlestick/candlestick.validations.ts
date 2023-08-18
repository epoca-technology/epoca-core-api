import {inject, injectable} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { ICandlestickModel, ICandlestickValidations } from "./interfaces";


@injectable()
export class CandlestickValidations implements ICandlestickValidations {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickModel)                   private _model: ICandlestickModel;
    @inject(SYMBOLS.ValidationsService)                 private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * The limit of data in milliseconds that can be read per request.
     */
    private readonly defaultLimit: number = 72 * 60 * 60 * 1000;           // 72 Hours
    private readonly predictionLimit: number = 120 * 24 * 60 * 60 * 1000;  // 120 days


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
            throw new Error(this._utils.buildApiError(`The provided start (${start}) and|or end (${end}) timestamps are not valid numbers.`, 1300));
        }

        // Make sure the end is greater than the start
        if (start >= end) {
            throw new Error(this._utils.buildApiError(`The end (${end}) timestamp must be greater than the start (${start}) timestamp.`, 1301));
        }

        // Make sure the interval is valid
        if (!this._validations.numberValid(intervalMinutes, 1, 5000)) {
            throw new Error(this._utils.buildApiError(`The provided minutes interval (${intervalMinutes}) is invalid.`, 1302));
        }

        // If running on production, validate the amount of data that is being read accordingly
        if (environment.production) {
            const dataLimit: number = intervalMinutes == this._model.predictionConfig.intervalMinutes ? 
                this.predictionLimit: this.defaultLimit;
            const difference: number = end - start;
            if (difference > dataLimit) {
                throw new Error(this._utils.buildApiError(`The candlesticks query is larger than the permitted data limit. 
                Limit: ${dataLimit}, Received: ${difference}`, 1303));
            }
        }
    }






}