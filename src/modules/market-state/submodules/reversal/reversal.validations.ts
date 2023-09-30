import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService, IValidationsService } from "../../../utilities";
import { IReversalConfiguration, IReversalValidations } from "./interfaces";




@injectable()
export class ReversalValidations implements IReversalValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;





    constructor() { }






    /***********
     * General *
     ***********/




    /**
     * Ensures the reversal ID is a valid number.
     * @param id 
     */
    public validateReversalID(id: number): void {
        if (!this._val.numberValid(id)) {
            throw new Error(this._utils.buildApiError(`The provided reversal id (${id}) is invalid.`, 37505));
        }
    }














    /****************************
     * Configuration Management *
     ****************************/










    /**
     * Validates the configuration object. Throws an error if the data is invalid.
     * @param newConfiguration 
     */
    public validateConfiguration(newConfiguration: IReversalConfiguration): void {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided reversal config object is invalid.`, 37500));
        }
        if (!this._val.numberValid(newConfiguration.support_reversal_score_requirement, 10, 100)) {
            throw new Error(this._utils.buildApiError(`The provided support_reversal_score_requirement (${newConfiguration.support_reversal_score_requirement}) is invalid.`, 37509));
        }
        if (!this._val.numberValid(newConfiguration.resistance_reversal_score_requirement, 10, 100)) {
            throw new Error(this._utils.buildApiError(`The provided resistance_reversal_score_requirement (${newConfiguration.resistance_reversal_score_requirement}) is invalid.`, 37510));
        }
        if (
            newConfiguration.event_sort_func != "CHANGE_SUM" && 
            newConfiguration.event_sort_func != "SHUFFLE"
        ) {
            throw new Error(this._utils.buildApiError(`The provided event_sort_func (${newConfiguration.event_sort_func}) is invalid.`, 37507));
        }
        if (!newConfiguration.score_weights || typeof newConfiguration.score_weights != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided reversal score_weights object is invalid.`, 37502));
        }
        if (
            !this._val.numberValid(newConfiguration.score_weights.volume, 1, 100) ||
            !this._val.numberValid(newConfiguration.score_weights.liquidity, 1, 100) ||
            !this._val.numberValid(newConfiguration.score_weights.coins, 1, 100) ||
            !this._val.numberValid(newConfiguration.score_weights.coins_btc, 1, 100)
        ) {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided score weights object must contain valid numbers randing 1-100.`, 37503));
        }
        const weightsSum: number = 
            newConfiguration.score_weights.volume + 
            newConfiguration.score_weights.liquidity + 
            newConfiguration.score_weights.coins +
            newConfiguration.score_weights.coins_btc;
        if (weightsSum != 100) {
            throw new Error(this._utils.buildApiError(`The sum of the weights must be equals to 100. Received: ${weightsSum}.`, 37504));
        }
    }
}