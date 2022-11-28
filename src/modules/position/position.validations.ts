import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IEpochService } from "../epoch";
import { IUtilitiesService } from "../utilities";
import { 
    IActivePosition,
    IPositionStrategy,
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionValidations implements IPositionValidations {
    // Inject dependencies
    @inject(SYMBOLS.EpochService)                private _epoch: IEpochService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}



    /***********************
     * Position Retrievers *
     ***********************/


    












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

    }



}
