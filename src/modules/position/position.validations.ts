import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IEpochService } from "../epoch";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IActivePosition,
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
        if (positionSize > availableBalance) {
            throw new Error(this._utils.buildApiError(`There isnt enough available balance to cover the ${side} position size. 
            Has: ${availableBalance}. Needs: ${positionSize}`, 30013));
        }
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
        if (side != "LONG" && side != "SHORT") {
            throw new Error(this._utils.buildApiError(`The provided side (${side}) is invalid.`, 30000));
        }

        // Make sure there is an active epoch
        if (!this._epoch.active.value) {
            throw new Error(this._utils.buildApiError(`Positions cannot be interacted with as there isnt an active Epoch.`, 30001));
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

        // Validate the statuses
        if (typeof newStrategy.long_status != "boolean" || typeof newStrategy.short_status != "boolean") {
            throw new Error(this._utils.buildApiError(`The long and short statuses must be valid booleans. 
            Received: ${newStrategy.long_status}, ${newStrategy.short_status}`, 30007));
        }

        // Validate the take profit
        if (typeof newStrategy.take_profit != "number" || !this._validations.numberValid(newStrategy.take_profit, 0.5, 10)) {
            throw new Error(this._utils.buildApiError(`The take profit must be a valid number ranging 0.5-10.
            Received: ${newStrategy.take_profit}`, 30008));
        }

        // Validate the stop loss
        if (typeof newStrategy.stop_loss != "number" || !this._validations.numberValid(newStrategy.stop_loss, 0.5, 10)) {
            throw new Error(this._utils.buildApiError(`The stop loss must be a valid number ranging 0.5-10. 
            Received: ${newStrategy.stop_loss}`, 30002));
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
