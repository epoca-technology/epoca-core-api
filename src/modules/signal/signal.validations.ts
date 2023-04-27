import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    ISignalPolicies,
    ISignalSidePolicies,
    ISignalValidations,
} from "./interfaces";




@injectable()
export class SignalValidations implements ISignalValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)         private _v: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;







    constructor() {}









    /************
     * Policies *
     ************/




    /**
     * Validates the provided policies object. If an issue is found, 
     * an error is thrown.
     * @param newPolicies 
     */
    public canPoliciesBeUpdated(newPolicies: ISignalPolicies): void {
        // Ensure the provided object is valid
        if (
            !newPolicies || typeof newPolicies != "object" || 
            !newPolicies.long || typeof newPolicies.long != "object" || 
            !newPolicies.long.issuance || typeof newPolicies.long.issuance != "object" || 
            !newPolicies.long.issuance.keyzone_reversal || typeof newPolicies.long.issuance.keyzone_reversal != "object" || 
            !newPolicies.long.cancellation || typeof newPolicies.long.cancellation != "object" || 
            !newPolicies.long.cancellation.window_state || typeof newPolicies.long.cancellation.window_state != "object" || 
            !newPolicies.long.cancellation.trend_sum || typeof newPolicies.long.cancellation.trend_sum != "object" || 
            !newPolicies.long.cancellation.trend_state || typeof newPolicies.long.cancellation.trend_state != "object" || 
            !newPolicies.short || typeof newPolicies.short != "object" || 
            !newPolicies.short.issuance || typeof newPolicies.short.issuance != "object" || 
            !newPolicies.short.issuance.keyzone_reversal || typeof newPolicies.short.issuance.keyzone_reversal != "object" || 
            !newPolicies.short.cancellation || typeof newPolicies.short.cancellation != "object" || 
            !newPolicies.short.cancellation.window_state || typeof newPolicies.short.cancellation.window_state != "object" || 
            !newPolicies.short.cancellation.trend_sum || typeof newPolicies.short.cancellation.trend_sum != "object" ||
            !newPolicies.short.cancellation.trend_state || typeof newPolicies.short.cancellation.trend_state != "object"
        ) {
            console.log(newPolicies);
            throw new Error(this._utils.buildApiError(`The provided signal policies object is invalid.`, 35503));
        }
        
        // Validate the long policies
        this.validateLongPolicies(newPolicies.long);

        // Validate the short policies
        this.validateShortPolicies(newPolicies.short);
    }






    /**
     * Ensures all the provided properties are valid for the long side.
     * @param policies 
     */
    private validateLongPolicies(policies: ISignalSidePolicies): void {
        // Validate the keyzone reversal issuance policy
        if (policies.issuance.keyzone_reversal.enabled != true) {
            throw new Error(this._utils.buildApiError(`The provided long issuance.enabled is invalid.`, 35504));
        }

        // Validate the window cancellation policy
        if (typeof policies.cancellation.window_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided long window_state.enabled is invalid.`, 35509));
        }
        if (!this._v.numberValid(policies.cancellation.window_state.window_state, -2, -1)) {
            throw new Error(this._utils.buildApiError(`The provided long window_state.window_state is invalid.`, 35510));
        }

        // Validate the trend sum cancellation policy
        if (typeof policies.cancellation.trend_sum.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided long trend_sum.enabled is invalid.`, 35511));
        }
        if (!this._v.numberValid(policies.cancellation.trend_sum.trend_sum, -8, -0.000001)) {
            throw new Error(this._utils.buildApiError(`The provided long trend_sum.trend_sum is invalid.`, 35514));
        }

        // Validate the trend state cancellation policy
        if (typeof policies.cancellation.trend_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided long trend_state.enabled is invalid.`, 35505));
        }
        if (!this._v.numberValid(policies.cancellation.trend_state.trend_state, -2, -1)) {
            throw new Error(this._utils.buildApiError(`The provided long trend_state.trend_state is invalid.`, 35512));
        }
    }









    /**
     * Ensures all the provided properties are valid for the short side.
     * @param policies 
     */
    private validateShortPolicies(policies: ISignalSidePolicies): void {
        // Validate the keyzone reversal issuance policy
        if (policies.issuance.keyzone_reversal.enabled != true) {
            throw new Error(this._utils.buildApiError(`The provided short issuance.enabled is invalid.`, 35504));
        }

        // Validate the window cancellation policy
        if (typeof policies.cancellation.window_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided short window_state.enabled is invalid.`, 35509));
        }
        if (!this._v.numberValid(policies.cancellation.window_state.window_state, 1, 2)) {
            throw new Error(this._utils.buildApiError(`The provided short window_state.window_state is invalid.`, 35510));
        }

        // Validate the trend sum cancellation policy
        if (typeof policies.cancellation.trend_sum.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided short trend_sum.enabled is invalid.`, 35511));
        }
        if (!this._v.numberValid(policies.cancellation.trend_sum.trend_sum, 0.000001, 8)) {
            throw new Error(this._utils.buildApiError(`The provided short trend.trend_sum is invalid.`, 35514));
        }

        // Validate the trend state cancellation policy
        if (typeof policies.cancellation.trend_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided short trend_state.enabled is invalid.`, 35505));
        }
        if (!this._v.numberValid(policies.cancellation.trend_state.trend_state, 1, 2)) {
            throw new Error(this._utils.buildApiError(`The provided short trend_state.trend_state is invalid.`, 35512));
        }
    }










    /***********
     * Records *
     ***********/
    


    /**
     * Ensures the signal records can be loaded for a given date range.
     * @param startAt 
     * @param endAt 
     */
    public canRecordsBeListed(startAt: number, endAt: number): void {
        // Make sure the start and the end have been provided
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The signal records range is invalid. Received: ${startAt} - ${endAt}.`, 35500));
        }

        // The start cannot be greater or equals to the end
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The signal records starting point must be less than the end. Received: ${startAt} - ${endAt}.`, 35501));
        }

        // Make sure the query does not exceed 15 days worth of data
        const dataLimit: number = 30 * 24 * 60 * 60 * 1000; // ~30 days
        const difference: number = endAt - startAt;
        if (difference > dataLimit) {
            throw new Error(this._utils.buildApiError(`The signal records query is larger than the permitted data limit. 
            Limit: ${dataLimit}, Received: ${difference}`, 35502));
        }
    }
}
