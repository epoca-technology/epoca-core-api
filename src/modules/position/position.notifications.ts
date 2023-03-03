import {inject, injectable} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { INotificationService } from "../notification";
import { IUtilitiesService } from "../utilities";
import { 
    IActivePosition,
    IPositionNotifications,
} from "./interfaces";




@injectable()
export class PositionNotifications implements IPositionNotifications {
    // Inject dependencies
    @inject(SYMBOLS.NotificationService)         private _notification: INotificationService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;



    /**
     * Liquidation
     * Whenever the mark price approaches the liquidation price users
     * are notified as positions are not suposed to get to this point.
     */
    private readonly liquidationAcceptableDistance: number = 2;
    private readonly liquidationThrottleMinutes: number = 3;
    private longLiquidationLastNotification: number|undefined = undefined;
    private shortLiquidationLastNotification: number|undefined = undefined;
    



    constructor() {}









    /******************************
     * On Active Position Refresh *
     ******************************/





    /**
     * Triggers whenever the active positions change. It will
     * check if a series of events exist. If so, it will broadcast
     * notifications to the users.
     * @param long 
     * @param short 
     * @returns Promise<void>
     */
    public async onActivePositionRefresh(
        long: IActivePosition|undefined, 
        short: IActivePosition|undefined
    ): Promise<void> {
        // Check the state of the long position if provided
        if (long) await this.checkLongPosition(long); 

        // Check the state of the short position if provided
        if (short) await this.checkShortPosition(short); 
    }





    /**
     * Checks if the state of the position meets the criteria
     * to notify users in order to take action.
     * @param long 
     * @returns Promise<void>
     */
    private async checkLongPosition(long: IActivePosition): Promise<void> {
        // Init the current time
        const currentTS: number = Date.now();

        // Check the liquidation price
        if (
            (this.longLiquidationLastNotification == undefined ||
            this.longLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf())
        ) {
            const distance: number = <number>this._utils.calculatePercentageChange(long.mark_price, long.liquidation_price);
            if (Math.abs(distance) <= this.liquidationAcceptableDistance) {
                await this._notification.liquidationPriceIsWarning(long, distance);
                this.longLiquidationLastNotification = currentTS;
            }
        }
    }





    /**
     * Checks if the state of the position meets the criteria
     * to notify users in order to take action.
     * @param short 
     * @returns Promise<void>
     */
    private async checkShortPosition(short: IActivePosition): Promise<void> {
        // Init the current time
        const currentTS: number = Date.now();

        // Check the liquidation price
        if (
            (this.shortLiquidationLastNotification == undefined ||
            this.shortLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf())
        ) {
            const distance: number = <number>this._utils.calculatePercentageChange(short.mark_price, short.liquidation_price);
            if (Math.abs(distance) <= this.liquidationAcceptableDistance) {
                await this._notification.liquidationPriceIsWarning(short, distance);
                this.shortLiquidationLastNotification = currentTS;
            }
        }
    }













    /*************************
     * Position Entry / Exit *
     *************************/






    /**
     * Triggers whenever a new position is opened.
     * @param side 
     * @param margin 
     * @param amount 
     * @returns Promise<void> 
     */
    public onNewPosition(side: IBinancePositionSide, margin: number, amount: number): Promise<void> {
        return this._notification.onNewPosition(side, margin, amount);
    }






    /**
     * Triggers whenever a position is closed fully or partially
     * and regardless of the result.
     * @param position 
     * @param chunkSize 
     * @returns Promise<void> 
     */
    public onPositionClose(position: IActivePosition, chunkSize: number): Promise<void> {
        /**
         * Even though it is unlikely, it is possible for the position 
         * to be unset prior to this notification being sent.
         */
        if (position) {
            return this._notification.onPositionClose(
                position.side, 
                chunkSize, 
                position.mark_price, 
                position.unrealized_pnl
            );
        }
    }















    /*************************
     * Position Action Error *
     *************************/






    /**
     * Triggers whenever there is an error during during
     * the candlestick stream.
     * @param error 
     * @returns Promise<void>
     */
    public onNewCandlesticksError(error: any): Promise<void> {
        return this._notification.positionError("Position.onNewCandlesticks", error);
    }







    /**
     * Triggers whenever there is an error during during
     * the signal stream.
     * @param error 
     * @returns Promise<void>
     */
    public onNewSignalError(error: any): Promise<void> {
        return this._notification.positionError("Position.onNewSignal", error);
    }
}
