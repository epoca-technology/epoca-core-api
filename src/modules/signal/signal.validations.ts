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
            !newPolicies.long.cancellation.trend || typeof newPolicies.long.cancellation.trend != "object" || 
            !newPolicies.short || typeof newPolicies.short != "object" || 
            !newPolicies.short.issuance || typeof newPolicies.short.issuance != "object" || 
            !newPolicies.short.issuance.keyzone_reversal || typeof newPolicies.short.issuance.keyzone_reversal != "object" || 
            !newPolicies.short.cancellation || typeof newPolicies.short.cancellation != "object" || 
            !newPolicies.short.cancellation.window_state || typeof newPolicies.short.cancellation.window_state != "object" || 
            !newPolicies.short.cancellation.trend || typeof newPolicies.short.cancellation.trend != "object"
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
        if (policies.issuance.keyzone_reversal.enabled !== true) {
            throw new Error(this._utils.buildApiError(`The provided long keyzone_reversal.enabled is invalid.`, 35504));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.trend_sum, 0, 8)) {
            throw new Error(this._utils.buildApiError(`The provided long keyzone_reversal.trend_sum is invalid.`, 35505));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.trend_state, 0, 2)) {
            throw new Error(this._utils.buildApiError(`The provided long keyzone_reversal.trend_state is invalid.`, 35506));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.volume_state, 0, 2)) {
            throw new Error(this._utils.buildApiError(`The provided long keyzone_reversal.volume_state is invalid.`, 35507));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.coin_state_event, -2, -1)) {
            throw new Error(this._utils.buildApiError(`The provided long keyzone_reversal.coin_state_event is invalid.`, 35508));
        }

        // Validate the window cancellation policy
        if (typeof policies.cancellation.window_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided long window_state.enabled is invalid.`, 35509));
        }
        if (!this._v.numberValid(policies.cancellation.window_state.window_state, 1, 2)) {
            throw new Error(this._utils.buildApiError(`The provided long window_state.window_state is invalid.`, 35510));
        }

        // Validate the trend cancellation policy
        if (typeof policies.cancellation.trend.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided long trend.enabled is invalid.`, 35511));
        }
        if (!this._v.numberValid(policies.cancellation.trend.trend_state, -2, 0)) {
            throw new Error(this._utils.buildApiError(`The provided long trend.trend_state is invalid.`, 35512));
        }
        if (!this._v.numberValid(policies.cancellation.trend.trend_sum, -8, 0)) {
            throw new Error(this._utils.buildApiError(`The provided long trend.trend_sum is invalid.`, 35514));
        }
        if (policies.cancellation.trend.trend_state == 0 && policies.cancellation.trend.trend_sum == 0) {
            throw new Error(this._utils.buildApiError(`The provided long trend cancellation policy is invalid. The sum or the state must be active.`, 35513));
        }
    }









    /**
     * Ensures all the provided properties are valid for the short side.
     * @param policies 
     */
    private validateShortPolicies(policies: ISignalSidePolicies): void {
        // Validate the keyzone reversal issuance policy
        if (policies.issuance.keyzone_reversal.enabled !== true) {
            throw new Error(this._utils.buildApiError(`The provided short keyzone_reversal.enabled is invalid.`, 35504));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.trend_sum, -8, 0)) {
            throw new Error(this._utils.buildApiError(`The provided short keyzone_reversal.trend_sum is invalid.`, 35505));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.trend_state, -2, 0)) {
            throw new Error(this._utils.buildApiError(`The provided short keyzone_reversal.trend_state is invalid.`, 35506));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.volume_state, 0, 2)) {
            throw new Error(this._utils.buildApiError(`The provided short keyzone_reversal.volume_state is invalid.`, 35507));
        }
        if (!this._v.numberValid(policies.issuance.keyzone_reversal.coin_state_event, 1, 2)) {
            throw new Error(this._utils.buildApiError(`The provided short keyzone_reversal.coin_state_event is invalid.`, 35508));
        }

        // Validate the window cancellation policy
        if (typeof policies.cancellation.window_state.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided short window_state.enabled is invalid.`, 35509));
        }
        if (!this._v.numberValid(policies.cancellation.window_state.window_state, -2, -1)) {
            throw new Error(this._utils.buildApiError(`The provided short window_state.window_state is invalid.`, 35510));
        }

        // Validate the trend state cancellation policy
        if (typeof policies.cancellation.trend.enabled != "boolean") {
            throw new Error(this._utils.buildApiError(`The provided short trend.enabled is invalid.`, 35511));
        }
        if (!this._v.numberValid(policies.cancellation.trend.trend_state, 0, 2)) {
            throw new Error(this._utils.buildApiError(`The provided short trend.trend_state is invalid.`, 35512));
        }
        if (!this._v.numberValid(policies.cancellation.trend.trend_sum, 0, 8)) {
            throw new Error(this._utils.buildApiError(`The provided short trend.trend_sum is invalid.`, 35514));
        }
        if (policies.cancellation.trend.trend_state == 0 && policies.cancellation.trend.trend_sum == 0) {
            throw new Error(this._utils.buildApiError(`The provided short trend cancellation policy is invalid. The sum or the state must be active.`, 35513));
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
