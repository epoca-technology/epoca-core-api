import {inject, injectable} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
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
    * Target
    * Whenever the mark price in a position hits the target it will send
    * a notification to the users to determine when the position should 
    * be closed.
    */
    private readonly targetThrottleMinutes: number = 5;
    private longTargetLastNotification: number|undefined = undefined;
    private shortTargetLastNotification: number|undefined = undefined;



    /**
    * Stop Loss
    * Whenever the mark price in a position hits the stop loss it will send
    * a notification to the users to determine if the position should be 
    * closed entirely, partially and not at all.
    */
    private readonly stopLossThrottleMinutes: number = 120;
    private longStopLossLastNotification: number|undefined = undefined;
    private shortStopLossLastNotification: number|undefined = undefined;



    /**
     * Liquidation
     * Whenever the distance between the mark price approaches the
     * min increase price, users must be notified in order to take action.
     */
    private readonly liquidationThrottleMinutes: number = 3;
    private longLiquidationLastNotification: number|undefined = undefined;
    private shortLiquidationLastNotification: number|undefined = undefined;
    



    constructor() {}






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

        // Check the target price
        if (
            long.mark_price >= long.target_price && 
            (
                this.longTargetLastNotification == undefined ||
                this.longTargetLastNotification < moment(currentTS).subtract(this.targetThrottleMinutes, "minutes").valueOf()
            )
        ) {
            await this._notification.positionHitTarget(long);
            this.longTargetLastNotification = currentTS;
        }

        // Check the stop loss price
        if (
            long.mark_price <= long.stop_loss_price && 
            (
                this.longStopLossLastNotification == undefined ||
                this.longStopLossLastNotification < moment(currentTS).subtract(this.stopLossThrottleMinutes, "minutes").valueOf()
            )
        ) {
            await this._notification.positionHitStopLoss(long);
            this.longStopLossLastNotification = currentTS;
        }

        // Check the liquidation price
        if (
            (this.longLiquidationLastNotification == undefined ||
            this.longLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf()) &&
            long.mark_price <= long.min_increase_price
        ) {
            const distance: number = <number>this._utils.calculatePercentageChange(long.mark_price, long.liquidation_price);
            await this._notification.liquidationPriceIsWarning(long, distance);
            this.longLiquidationLastNotification = currentTS;
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

        // Check the target price
        if (
            short.mark_price <= short.target_price && 
            (
                this.shortTargetLastNotification == undefined ||
                this.shortTargetLastNotification < moment(currentTS).subtract(this.targetThrottleMinutes, "minutes").valueOf()
            )
        ) {
            await this._notification.positionHitTarget(short);
            this.shortTargetLastNotification = currentTS;
        }

        // Check the stop loss price
        if (
            short.mark_price >= short.stop_loss_price && 
            (
                this.shortStopLossLastNotification == undefined ||
                this.shortStopLossLastNotification < moment(currentTS).subtract(this.stopLossThrottleMinutes, "minutes").valueOf()
            )
        ) {
            await this._notification.positionHitStopLoss(short);
            this.shortStopLossLastNotification = currentTS;
        }

        // Check the liquidation price
        if (
            (this.shortLiquidationLastNotification == undefined ||
            this.shortLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf()) &&
            short.mark_price >= short.min_increase_price
        ) {
            const distance: number = <number>this._utils.calculatePercentageChange(short.mark_price, short.liquidation_price);
            await this._notification.liquidationPriceIsWarning(short, distance);
            this.shortLiquidationLastNotification = currentTS;
        }
    }
}
