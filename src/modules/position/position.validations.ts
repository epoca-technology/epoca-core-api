import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IEpochService } from "../epoch";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IActivePosition,
    IPositionStrategy,
    IPositionStrategyLevel,
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
     * Performs a basic validation in order to ensure that positions
     * can be interacted with.
     * @param side 
     */
    public canInteractWithPositions(side: IBinancePositionSide): void {
        // Make sure the provided side is valid
        if (side != "LONG" && side != "SHORT") {
            throw new Error(this._utils.buildApiError(`The provided side (${side}) is invalid.`, 30000));
        }

        // Make sure there is an active epoch
        if (!this._epoch.active.value) {
            throw new Error(this._utils.buildApiError(`Positions cannot be interacted with as there isnt an active Epoch.`, 30001));
        }
    }






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
        firstLeveLSize: number, 
        availableBalance: number
    ): void {
        // Make sure the position is not active
        if (position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be opened because it is already active.`, 30012));
        }

        // Ensure there is enough balance to cover the level size
        if (firstLeveLSize > availableBalance) {
            throw new Error(this._utils.buildApiError(`There isnt enough available balance to cover the ${side} position. 
            Has: ${availableBalance}. Needs: ${firstLeveLSize}`, 30013));
        }
    }


    



    /**
     * Verifies if a position can be increased.
     * @param side 
     * @param position 
     * @param nextLevel
     * @param availableBalance 
     */
    public canIncreasePosition(
        side: IBinancePositionSide, 
        position: IActivePosition|undefined, 
        nextLevel: IPositionStrategyLevel|undefined, 
        availableBalance: number
    ): void {
        // Make sure the position is active
        if (!position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be increased because it isnt active.`, 30014));
        }

        // Make sure the price meets the min inrease requirement
        if (position.side == "LONG" && position.mark_price > position.min_increase_price) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be increased because the mark price doesnt meet the 
            min increase requirement. Has: ${position.mark_price}. Needs: ${position.min_increase_price}`, 30017));
        }
        if (position.side == "SHORT" && position.mark_price < position.min_increase_price) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be increased because the mark price doesnt meet the 
            min increase requirement. Has: ${position.mark_price}. Needs: ${position.min_increase_price}`, 30017));
        }

        // Make sure there is a next level
        if (!nextLevel) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be increased because is no next level.`, 30015));
        }

        // Make sure there is enough available balance
        if (nextLevel.size > availableBalance) {
            throw new Error(this._utils.buildApiError(`There isnt enough available balance to cover the ${side} position increase. 
            Has: ${availableBalance}. Needs: ${nextLevel.size}`, 30016));
        }
    }







    /**
     * Verifies if a position can be closed.
     * @param side 
     * @param position 
     * @returns void
     */
    public canClosePosition(side: IBinancePositionSide, position: IActivePosition|undefined): void {
        if (!position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be closed because it isnt active.`, 30011));
        }
    }











    /*********************
     * Position Strategy *
     *********************/




    /**
     * Verifies if the position strategy can be updated.
     * @param newStrategy 
     * @param activeLong 
     * @param activeShort 
     * @returns void
     */
    public canStrategyBeUpdated(
        newStrategy: IPositionStrategy, 
        activeLong: IActivePosition|undefined, 
        activeShort: IActivePosition|undefined
    ): void {
        // Make sure there isn't an active long position
        if (activeLong) {
            throw new Error(this._utils.buildApiError(`The strategy cannot be updated because there is an active long position.`, 30002));
        }

        // Make sure there isn't an active short position
        if (activeShort) {
            throw new Error(this._utils.buildApiError(`The strategy cannot be updated because there is an active short position.`, 30003));
        }

        // Make sure the provided strategy is a valid object
        if (!newStrategy || typeof newStrategy != "object") {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The provided strategy is not a valid object.`, 30004));
        }

        // Validate the leverage
        if (typeof newStrategy.leverage != "number" || !this._validations.numberValid(newStrategy.leverage, 1, 5)) {
            throw new Error(this._utils.buildApiError(`The leverage must be a valid number ranging 1-5. 
            Received: ${newStrategy.leverage}`, 30005));
        }

        // Validate the level increase requirement
        if (
            typeof newStrategy.level_increase_requirement != "number" || 
            !this._validations.numberValid(newStrategy.level_increase_requirement, 0.01, 10)
        ) {
            throw new Error(this._utils.buildApiError(`The level increase requirement must be a valid number ranging 0.01-10. 
            Received: ${newStrategy.level_increase_requirement}`, 30006));
        }

        // Validate level_1
        if (
            !newStrategy.level_1 || 
            typeof newStrategy.level_1 != "object" ||
            newStrategy.level_1.id != "level_1" ||
            !this._validations.numberValid(newStrategy.level_1.size, 150, 500000) ||
            !this._validations.numberValid(newStrategy.level_1.target, 0, 10)
        ) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The strategy could not be updated because level_1 is invalid.`, 30007));
        }

        // Validate level_2
        if (
            !newStrategy.level_2 || 
            typeof newStrategy.level_2 != "object" ||
            newStrategy.level_2.id != "level_2" ||
            newStrategy.level_2.size != this._utils.outputNumber(new BigNumber(newStrategy.level_1.size).times(2)) ||
            !this._validations.numberValid(newStrategy.level_2.target, 0, 10)
        ) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The strategy could not be updated because level_2 is invalid.`, 30008));
        }

        // Validate level_3
        if (
            !newStrategy.level_3 || 
            typeof newStrategy.level_3 != "object" ||
            newStrategy.level_3.id != "level_3" ||
            newStrategy.level_3.size != this._utils.outputNumber(new BigNumber(newStrategy.level_2.size).times(2)) ||
            !this._validations.numberValid(newStrategy.level_3.target, 0, 10)
        ) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The strategy could not be updated because level_3 is invalid.`, 30009));
        }

        // Validate level_4
        if (
            !newStrategy.level_4 || 
            typeof newStrategy.level_4 != "object" ||
            newStrategy.level_4.id != "level_4" ||
            newStrategy.level_4.size != this._utils.outputNumber(new BigNumber(newStrategy.level_3.size).times(2)) ||
            !this._validations.numberValid(newStrategy.level_4.target, 0, 10)
        ) {
            console.log(newStrategy);
            throw new Error(this._utils.buildApiError(`The strategy could not be updated because level_4 is invalid.`, 30010));
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

        // Make sure the query does not exceed 15 days worth of data
        const difference: number = endAt - startAt;
        if (difference > this.tradeListLimit) {
            throw new Error(this._utils.buildApiError(`The trade list query is larger than the permitted data limit. 
            Limit: ${this.tradeListLimit}, Received: ${difference}`, 30019));
        }
    }
}
