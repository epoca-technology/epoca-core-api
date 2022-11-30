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
     * Liquidation
     * Whenever the distance between the mark price and the liquidation
     * price becomes smaller than or equals to maxLiquidationDistance,
     * users must be notified in order to take action.
     */
    private readonly liquidationThrottleMinutes: number = 3;
    private readonly minLiquidationDistance: number = 15;
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

        // Check the liquidation price
        if (
            this.longLiquidationLastNotification == undefined ||
            this.longLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf()
        ) {
            const liquidationPriceWarning: number = <number>this._utils.alterNumberByPercentage(long.liquidation_price, this.minLiquidationDistance);
            if (long.mark_price <= liquidationPriceWarning) {
                await this._notification.liquidationPriceIsWarning(long, this.minLiquidationDistance);
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

        // Check the liquidation price
        if (
            this.shortLiquidationLastNotification == undefined ||
            this.shortLiquidationLastNotification < moment(currentTS).subtract(this.liquidationThrottleMinutes, "minutes").valueOf()
        ) {
            const liquidationPriceWarning: number = <number>this._utils.alterNumberByPercentage(short.liquidation_price, -(this.minLiquidationDistance));
            if (short.mark_price >= liquidationPriceWarning) {
                await this._notification.liquidationPriceIsWarning(short, this.minLiquidationDistance);
                this.shortLiquidationLastNotification = currentTS;
            }
        }
    }
}
