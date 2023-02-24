import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IEpochService } from "../epoch";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IActivePosition,
    IPositionHealthWeights,
    IPositionStrategy,
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionValidations implements IPositionValidations {
    // Inject dependencies
    @inject(SYMBOLS.EpochService)                private _epoch: IEpochService;
    @inject(SYMBOLS.ValidationsService)          private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    /**
     * The limit of data in milliseconds that can be read per request.
     */
     private readonly tradeListLimit: number = 730 * 24 * 60 * 60 * 1000;       // 730 days


    constructor() {}






    /***********************
     * Position Management *
     ***********************/





    /**
     * Verifies if a position can be opened.
     * @param side 
     * @param position 
     * @param firstLeveLSize 
     * @param availableBalance 
     */
    public canOpenPosition(
        side: IBinancePositionSide, 
        position: IActivePosition|undefined, 
        positionSize: number, 
        availableBalance: number
    ): void {
        // Ensure the positions can be interacted with
        this.canInteractWithPositions(side);

        // Make sure the position is not active
        if (position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be opened because it is already active.`, 30012));
        }

        // Ensure there is enough balance to cover the position size
        /**
         * IMPORTANT: This validation has been silenced as the balance is not updated frequently enough. 
         * Moreover, Binance sometimes takes some time to provided the updated balance. If there is a 
         * balance issue, it will be described in the API error.
         */
        /*if (positionSize > availableBalance) {
            throw new Error(this._utils.buildApiError(`There isnt enough available balance to cover the ${side} position size. 
            Has: ${availableBalance}. Needs: ${positionSize}`, 30013));
        }*/
    }





    /**
     * Verifies if a position can be closed.
     * @param side 
     * @param position 
     * @returns void
     */
    public canClosePosition(
        side: IBinancePositionSide, 
        position: IActivePosition|undefined, 
        chunkSize: number
    ): void {
        // Ensure the positions can be interacted with
        this.canInteractWithPositions(side);

        // Ensure the position is currently active
        if (!position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be closed because it isnt active.`, 30011));
        }

        // Ensure the chunk size is valid
        if (
            chunkSize !== 0.25 && 
            chunkSize !== 0.33 && 
            chunkSize !== 0.5 && 
            chunkSize !== 0.66 && 
            chunkSize !== 0.75 && 
            chunkSize !== 1
        ) {
            throw new Error(this._utils.buildApiError(`A position can only be closed with a valid chunk size. Received ${chunkSize}`, 30020));
        }
    }






    /**
     * Performs a basic validation in order to ensure that positions
     * can be interacted with.
     * @param side 
     */
    private canInteractWithPositions(side: IBinancePositionSide): void {
        // Make sure the provided side is valid
        this.validatePositionSide(side);

        // Make sure there is an active epoch
        if (!this._epoch.active.value) {
            throw new Error(this._utils.buildApiError(`Positions cannot be interacted with as there isnt an active Epoch.`, 30001));
        }
    }







    /**
     * Validates a given side and throws an error if invalid.
     * @param side 
     */
    public validatePositionSide(side: IBinancePositionSide): void {
        if (side != "LONG" && side != "SHORT") {
            throw new Error(this._utils.buildApiError(`The provided side (${side}) is invalid.`, 30000));
        }
    }



















    /*********************
     * Position Strategy *
     *********************/




    /**
     * Verifies if the position strategy can be updated.
     * @param currentStrategy 
     * @param newStrategy 
     * @returns void
     */
    public canStrategyBeUpdated(currentStrategy: IPositionStrategy, newStrategy: IPositionStrategy): void {
        // Make sure the provided strategy is a valid object
        if (!newStrategy || typeof newStrategy != "object") {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The provided strategy is not a valid object.`, 30004));
        }

        // Validate the statuses
        if (typeof newStrategy.long_status != "boolean" || typeof newStrategy.short_status != "boolean") {
            throw new Error(this._utils.buildApiError(`The long and short statuses must be valid booleans. 
            Received: ${newStrategy.long_status}, ${newStrategy.short_status}`, 30007));
        }

        // Validate the hedge mode
        if (typeof newStrategy.hedge_mode != "boolean") {
            throw new Error(this._utils.buildApiError(`The hedge_mode must be a valid boolean. Received: ${newStrategy.hedge_mode}`, 30003));
        }

        // Validate the leverage
        if (typeof newStrategy.leverage != "number" || !this._validations.numberValid(newStrategy.leverage, 2, 15)) {
            throw new Error(this._utils.buildApiError(`The leverage must be a valid number ranging 2-15. 
            Received: ${newStrategy.leverage}`, 30005));
        }

        // Validate the position size
        if (typeof newStrategy.position_size != "number" || !this._validations.numberValid(newStrategy.position_size, 150, 100000)) {
            throw new Error(this._utils.buildApiError(`The position size must be a valid number ranging 150-100,000. 
            Received: ${newStrategy.position_size}`, 30006));
        }

        // Validate the take profit 1
        if (
            typeof newStrategy.take_profit_1 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_1.price_change_requirement, 0.4, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_1.max_hp_drawdown, -70, 0) ||
            !this._validations.numberValid(newStrategy.take_profit_1.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_1);
            throw new Error(this._utils.buildApiError(`The take profit 1 must be a valid object containing the price change 
            requirement, the max hp drawdown & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 2
        if (
            typeof newStrategy.take_profit_2 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_2.price_change_requirement, 0.4, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_2.max_hp_drawdown, -70, 0) ||
            !this._validations.numberValid(newStrategy.take_profit_2.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_2);
            throw new Error(this._utils.buildApiError(`The take profit 2 must be a valid object containing the price change 
            requirement, the max hp drawdown & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 3
        if (
            typeof newStrategy.take_profit_3 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_3.price_change_requirement, 0.4, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_3.max_hp_drawdown, -70, 0) ||
            !this._validations.numberValid(newStrategy.take_profit_3.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_3);
            throw new Error(this._utils.buildApiError(`The take profit 3 must be a valid object containing the price change 
            requirement, the max hp drawdown & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 4
        if (
            typeof newStrategy.take_profit_4 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_4.price_change_requirement, 0.4, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_4.max_hp_drawdown, -70, 0) ||
            !this._validations.numberValid(newStrategy.take_profit_4.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_4);
            throw new Error(this._utils.buildApiError(`The take profit 4 must be a valid object containing the price change 
            requirement, the max hp drawdown & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 5
        if (
            typeof newStrategy.take_profit_5 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_5.price_change_requirement, 0.4, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_5.max_hp_drawdown, -70, 0) ||
            !this._validations.numberValid(newStrategy.take_profit_5.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_5);
            throw new Error(this._utils.buildApiError(`The take profit 5 must be a valid object containing the price change 
            requirement, the max hp drawdown & the max gain drawdown.`, 30008));
        }

        // Validate the Max HP Drawdown in profit
        if (!this._validations.numberValid(newStrategy.max_hp_drawdown_in_profit, -99, -10)) {
            throw new Error(this._utils.buildApiError(`The max_hp_drawdown_in_profit must be a valid number ranging -99 - -10. 
            Received: ${newStrategy.max_hp_drawdown_in_profit}`, 30022));
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
            in ascending order.`, 30021));
        }

        // Validate the stop loss
        if (typeof newStrategy.stop_loss != "number" || !this._validations.numberValid(newStrategy.stop_loss, 0.5, 10)) {
            throw new Error(this._utils.buildApiError(`The stop loss must be a valid number ranging 0.5-10. 
            Received: ${newStrategy.stop_loss}`, 30002));
        }
        if (!this._validations.numberValid(newStrategy.max_hp_drawdown_in_loss, -99, -10)) {
            throw new Error(this._utils.buildApiError(`The max_hp_drawdown_in_loss must be a valid number ranging -99 - -10. 
            Received: ${newStrategy.max_hp_drawdown_in_loss}`, 30023));
        }

        // Validate the idle minutes
        if (
            typeof newStrategy.long_idle_minutes != "number" ||
            !this._validations.numberValid(newStrategy.long_idle_minutes, 1, 1000) ||
            typeof newStrategy.short_idle_minutes != "number" ||
            !this._validations.numberValid(newStrategy.short_idle_minutes, 1, 1000)
        ) {
            throw new Error(this._utils.buildApiError(`The long and short idle minutes must be valid numbers ranging 1-1,000. 
            Received: ${newStrategy.long_status}, ${newStrategy.short_status}`, 30009));
        }

        // Ensure non of the inmutable properties have changed
        if (
            currentStrategy.long_idle_until != newStrategy.long_idle_until ||
            currentStrategy.short_idle_until != newStrategy.short_idle_until ||
            currentStrategy.ts != newStrategy.ts
        ) {
            throw new Error(this._utils.buildApiError(`The following properties cannot be changed by the user: 
            long_idle_until, short_idle_until and ts.`, 30010));
        }
    }












    /*******************
     * Position Health *
     *******************/







    /**
     * Ensures the position weights are valid and can be updated.
     * @param weights 
     */
    public canPositionHealthWeightsBeUpdated(weights: IPositionHealthWeights): void {
        // Ensure the provided weights are a valid object
        if (!weights || typeof weights != "object") {
            console.log(weights);
            throw new Error(this._utils.buildApiError(`The provided position health weights is not a valid object.`, 30024));
        }

        // Ensure all the properties are valid
        if (
            !this._validations.numberValid(weights.trend_sum, 0.1, 100) ||
            !this._validations.numberValid(weights.trend_state, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_15m, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_30m, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_1h, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_2h, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_4h, 0.1, 100) ||
            !this._validations.numberValid(weights.ta_1d, 0.1, 100) ||
            !this._validations.numberValid(weights.open_interest, 0.1, 100) ||
            !this._validations.numberValid(weights.open_interest_state, 0.1, 100) ||
            !this._validations.numberValid(weights.long_short_ratio, 0.1, 100) ||
            !this._validations.numberValid(weights.long_short_ratio_state, 0.1, 100) ||
            !this._validations.numberValid(weights.volume_direction, 0.1, 100)
        ) {
            console.log(weights);
            throw new Error(this._utils.buildApiError(`There is a property in the position health weights that has an invalid format 
            or a value that exceeds the limits.`, 30025));
        }

        // Ensure the sum is valid
        const sum: number = Object.values(weights).reduce((a, b) => a + b, 0);
        if (sum != 100) {
            throw new Error(this._utils.buildApiError(`The sum of all the position health weight properties must result in 100. Received: ${sum}`, 30026));
        }
    }












    










    /*******************
     * Position Trades *
     *******************/




    
    /**
     * Ensures the provided date range is valid and that it
     * isn't larger than the limit.
     * @param startAt 
     * @param endAt 
     */
    public canTradesBeListed(startAt: number, endAt: number): void {
        // Make sure the start and the end have been provided
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The trade list date range is invalid. Received: ${startAt} - ${endAt}.`, 30017));
        }

        // The start cannot be greater or equals to the end
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The trade list starting point must be less than the end. Received: ${startAt} - ${endAt}.`, 30018));
        }

        // Make sure the query does not exceed 730 days worth of data
        const difference: number = endAt - startAt;
        if (difference > this.tradeListLimit) {
            throw new Error(this._utils.buildApiError(`The trade list query is larger than the permitted data limit. 
            Limit: ${this.tradeListLimit}, Received: ${difference}`, 30019));
        }
    }
}
