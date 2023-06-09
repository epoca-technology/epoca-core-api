import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IPositionActionKind,
    IPositionStrategy,
    IPositionValidations
} from "./interfaces";
import { ICoinsService } from "../market-state";




@injectable()
export class PositionValidations implements IPositionValidations {
    // Inject dependencies
    @inject(SYMBOLS.CoinsService)               private _coins: ICoinsService;
    @inject(SYMBOLS.ValidationsService)          private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    constructor() {}







    /******************************
     * Position Record Management *
     ******************************/






    /**
     * Verifies if a position can be retrieved from a given id.
     * @param id 
     */
    public canPositionRecordBeRetrieved(id: string): void {
        if (!this._validations.uuidValid(id)) {
            throw new Error(this._utils.buildApiError(`The provided position id is invalid: ${id}.`, 30007));
        }
    }








    /**
     * Verifies if the position headlines can be listed for a 
     * given date range.
     * @param startAt 
     * @param endAt 
     */
    public canPositionHeadlinesBeListed(startAt: number, endAt: number): void {
        // Make sure the start and the end have been provided
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The positions date range is invalid. Received: ${startAt} - ${endAt}.`, 30009));
        }

        // The start cannot be greater or equals to the end
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The positions starting point must be less than the end. Received: ${startAt} - ${endAt}.`, 30010));
        }

        // Make sure the query does not exceed the data limit
        const dataLimit: number = 1825 * 24 * 60 * 60 * 1000; // ~1825 days
        const difference: number = endAt - startAt;
        if (difference > dataLimit) {
            throw new Error(this._utils.buildApiError(`The positions query is larger than the permitted data limit. 
            Limit: ${dataLimit}, Received: ${difference}`, 30011));
        }
    }













    /**************************************
     * Position Action Payload Management *
     **************************************/







    /**
     * Ensures the payloads can be listed based on provided params.
     * @param kind 
     * @param startAt 
     * @param endAt 
     */
    public canPositionActionPayloadsBeListed(kind: IPositionActionKind, startAt: number, endAt: number): void {
        // Make sure the provided kind is valid
        if (kind != "POSITION_OPEN" && kind != "POSITION_CLOSE") {
            throw new Error(this._utils.buildApiError(`The pos. action payloads cannot be listed because an invalid kind was provided: ${kind}`, 30012));
        }
        // Make sure the start and the end have been provided
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The pos. action payloads date range is invalid. Received: ${startAt} - ${endAt}.`, 30013));
        }

        // The start cannot be greater or equals to the end
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The pos. action payloads starting point must be less than the end. Received: ${startAt} - ${endAt}.`, 30014));
        }

        // Make sure the query does not exceed the data limit
        const dataLimit: number = 365 * 24 * 60 * 60 * 1000; // ~365 days
        const difference: number = endAt - startAt;
        if (difference > dataLimit) {
            throw new Error(this._utils.buildApiError(`The pos. action payloads query is larger than the permitted data limit. 
            Limit: ${dataLimit}, Received: ${difference}`, 30015));
        }
    }















    /*********************
     * Position Strategy *
     *********************/




    /**
     * Verifies if the position strategy can be updated.
     * @param newStrategy 
     * @returns void
     */
    public canStrategyBeUpdated(newStrategy: IPositionStrategy): void {
        // Make sure the provided strategy is a valid object
        if (!newStrategy || typeof newStrategy != "object") {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The provided strategy is not a valid object.`, 30004));
        }

        // Validate the statuses
        if (typeof newStrategy.long_status != "boolean" || typeof newStrategy.short_status != "boolean") {
            throw new Error(this._utils.buildApiError(`The long and short statuses must be valid booleans. 
            Received: ${newStrategy.long_status}, ${newStrategy.short_status}`, 30000));
        }

        // Validate the leverage
        if (typeof newStrategy.leverage != "number" || !this._validations.numberValid(newStrategy.leverage, 2, 125)) {
            throw new Error(this._utils.buildApiError(`The leverage must be a valid number ranging 2-125. 
            Received: ${newStrategy.leverage}`, 30001));
        }

        // Validate the position size
        if (typeof newStrategy.position_size != "number" || !this._validations.numberValid(newStrategy.position_size, 0.25, 10000)) {
            throw new Error(this._utils.buildApiError(`The position size must be a valid number ranging 0.25-10,000. 
            Received: ${newStrategy.position_size}`, 30003));
        }

        // Validate the side increase limit
        if (typeof newStrategy.side_increase_limit != "number" || !this._validations.numberValid(newStrategy.side_increase_limit, 1, 1000)) {
            throw new Error(this._utils.buildApiError(`The side_increase_limit must be a valid number ranging 1-1,000. 
            Received: ${newStrategy.side_increase_limit}`, 30016));
        }

        // Validate the side min percentage
        if (typeof newStrategy.side_min_percentage != "number" || !this._validations.numberValid(newStrategy.side_min_percentage, 1, 100)) {
            throw new Error(this._utils.buildApiError(`The side_min_percentage must be a valid number ranging 1-100. 
            Received: ${newStrategy.side_min_percentage}`, 30017));
        }

        // Validate the increase price improvement requirement
        if (
            typeof newStrategy.increase_side_on_price_improvement != "number" || 
            !this._validations.numberValid(newStrategy.increase_side_on_price_improvement, 0.1, 100)) {
            throw new Error(this._utils.buildApiError(`The increase_side_on_price_improvement must be a valid number ranging 0.1-100. 
            Received: ${newStrategy.increase_side_on_price_improvement}`, 30002));
        }

        // Validate the side increase idle hours
        if (
            typeof newStrategy.side_increase_idle_hours != "number" || 
            !this._validations.numberValid(newStrategy.side_increase_idle_hours, 1, 1000)) {
            throw new Error(this._utils.buildApiError(`The side_increase_idle_hours must be a valid number ranging 1-1000. 
            Received: ${newStrategy.side_increase_idle_hours}`, 30018));
        }

        // Validate the take profit 1
        if (
            typeof newStrategy.take_profit_1 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_1.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_1.reduction_size, 0.01, 1) ||
            !this._validations.numberValid(newStrategy.take_profit_1.reduction_interval_minutes, 0.1, 1000)
        ) {
            console.log(newStrategy.take_profit_1);
            throw new Error(this._utils.buildApiError(`The provided take profit 1 object does not contain all the required properties.`, 30008));
        }

        // Validate the take profit 2
        if (
            typeof newStrategy.take_profit_2 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_2.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_2.reduction_size, 0.01, 1) ||
            !this._validations.numberValid(newStrategy.take_profit_2.reduction_interval_minutes, 0.1, 1000)
        ) {
            console.log(newStrategy.take_profit_2);
            throw new Error(this._utils.buildApiError(`The provided take profit 2 object does not contain all the required properties.`, 30008));
        }

        // Validate the take profit 3
        if (
            typeof newStrategy.take_profit_3 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_3.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_3.reduction_size, 0.01, 1) ||
            !this._validations.numberValid(newStrategy.take_profit_3.reduction_interval_minutes, 0.1, 1000)
        ) {
            console.log(newStrategy.take_profit_3);
            throw new Error(this._utils.buildApiError(`The provided take profit 3 object does not contain all the required properties.`, 30008));
        }

        // Validate the take profit 4
        if (
            typeof newStrategy.take_profit_4 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_4.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_4.reduction_size, 0.01, 1) ||
            !this._validations.numberValid(newStrategy.take_profit_4.reduction_interval_minutes, 0.1, 1000)
        ) {
            console.log(newStrategy.take_profit_4);
            throw new Error(this._utils.buildApiError(`The provided take profit 4 object does not contain all the required properties.`, 30008));
        }

        // Validate the take profit 5
        if (
            typeof newStrategy.take_profit_5 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_5.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_5.reduction_size, 0.01, 1) ||
            !this._validations.numberValid(newStrategy.take_profit_5.reduction_interval_minutes, 0.1, 1000)
        ) {
            console.log(newStrategy.take_profit_5);
            throw new Error(this._utils.buildApiError(`The provided take profit 5 object does not contain all the required properties.`, 30008));
        }

        // Ensure the take profit levels are in ascending order
        const ascendingTakeProfits: boolean = 
            newStrategy.take_profit_2.price_change_requirement > newStrategy.take_profit_1.price_change_requirement &&
            newStrategy.take_profit_3.price_change_requirement > newStrategy.take_profit_2.price_change_requirement &&
            newStrategy.take_profit_4.price_change_requirement > newStrategy.take_profit_3.price_change_requirement &&
            newStrategy.take_profit_5.price_change_requirement > newStrategy.take_profit_4.price_change_requirement;
        if (!ascendingTakeProfits) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The price change requirements in the take profits must be provided
            in ascending order.`, 30006));
        }
    }




}
