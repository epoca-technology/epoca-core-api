import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IPositionStrategy,
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionValidations implements IPositionValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)          private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    constructor() {}












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
        if (typeof newStrategy.leverage != "number" || !this._validations.numberValid(newStrategy.leverage, 2, 20)) {
            throw new Error(this._utils.buildApiError(`The leverage must be a valid number ranging 2-20. 
            Received: ${newStrategy.leverage}`, 30001));
        }

        // Validate the position size
        if (typeof newStrategy.position_size != "number" || !this._validations.numberValid(newStrategy.position_size, 25, 10000)) {
            throw new Error(this._utils.buildApiError(`The position size must be a valid number ranging 25-10,000. 
            Received: ${newStrategy.position_size}`, 30003));
        }

        // Validate the positions limit
        if (typeof newStrategy.positions_limit != "number" || !this._validations.numberValid(newStrategy.positions_limit, 1, 9)) {
            throw new Error(this._utils.buildApiError(`The positions limit must be a valid number ranging 1-9. 
            Received: ${newStrategy.positions_limit}`, 30005));
        }

        // Validate the take profit 1
        if (
            typeof newStrategy.take_profit_1 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_1.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_1.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_1);
            throw new Error(this._utils.buildApiError(`The take profit 1 must be a valid object containing the price change 
            requirement & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 2
        if (
            typeof newStrategy.take_profit_2 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_2.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_2.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_2);
            throw new Error(this._utils.buildApiError(`The take profit 2 must be a valid object containing the price change 
            requirement & the max gain drawdown.`, 30008));
        }

        // Validate the take profit 3
        if (
            typeof newStrategy.take_profit_3 != "object" || 
            !this._validations.numberValid(newStrategy.take_profit_3.price_change_requirement, 0.05, 10) ||
            !this._validations.numberValid(newStrategy.take_profit_3.max_gain_drawdown, -100, -0.01)
        ) {
            console.log(newStrategy.take_profit_3);
            throw new Error(this._utils.buildApiError(`The take profit 3 must be a valid object containing the price change 
            requirement & the max gain drawdown.`, 30008));
        }



        // Ensure the take profit levels are in ascending order
        const ascendingTakeProfits: boolean = 
            newStrategy.take_profit_2.price_change_requirement > newStrategy.take_profit_1.price_change_requirement &&
            newStrategy.take_profit_3.price_change_requirement > newStrategy.take_profit_2.price_change_requirement;
        if (!ascendingTakeProfits) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The price change requirements in the take profits must be provided
            in ascending order.`, 30021));
        }

        // Validate the stop loss
        if (typeof newStrategy.stop_loss != "number" || !this._validations.numberValid(newStrategy.stop_loss, 0.1, 20)) {
            throw new Error(this._utils.buildApiError(`The stop loss must be a valid number ranging 0.1-20. 
            Received: ${newStrategy.stop_loss}`, 30002));
        }
    }




}
