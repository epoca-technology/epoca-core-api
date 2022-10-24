import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IEpochService } from "../epoch";
import { INotificationService } from "../notification";
import { IOrderBookService } from "../order-book";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IPredictionService, ISignalService } from "./interfaces";




@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.EpochService)                       private _epoch: IEpochService;
    @inject(SYMBOLS.PredictionService)                  private _prediction: IPredictionService;
    @inject(SYMBOLS.OrderBookService)                   private _orderBook: IOrderBookService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;

    // A signal can only be broadcasted every throttleMinutes
    private readonly throttleMinutes: number = 10;

    // The last timestamp in which a prediction was broadcasted
    private lastBroadcast: number|undefined = undefined;


    constructor() {}




    /**
     * Subscribes to the prediction and broadcasts non-neutral predictions
     * in a trading signal format.
     */
    @postConstruct()
    private onInit(): void {
        this._prediction.active.subscribe(async (pred: IPrediction|undefined) => {
            if (
                this._epoch.active.value && 
                pred && 
                pred.r != 0 &&
                (this.lastBroadcast == undefined || this.lastBroadcast < moment().subtract(this.throttleMinutes, "minutes").valueOf())
            ) {
                try {
                    // Init signal
                    let signal: {
                        kind: IPredictionResult, 
                        entry: number, 
                        takeProfit: number,
                        stopLoss: number
                    } = { kind: 0, entry: 0, takeProfit: 0, stopLoss: 0 }

                    // Retrieve the safe rates from order book
                    const { safe_bid, safe_ask } = await this._orderBook.getBook();

                    // Handle a long prediction
                    if (pred.r == 1) {
                        signal = {
                            kind: 1,
                            entry: safe_ask,
                            takeProfit: <number>this._utils.alterNumberByPercentage(
                                safe_ask, 
                                this._epoch.active.value.model.price_change_requirement,
                                {dp: 0, ru: true}
                            ),
                            stopLoss: <number>this._utils.alterNumberByPercentage(
                                safe_ask, 
                                -this._epoch.active.value.model.price_change_requirement,
                                {dp: 0, ru: true}
                            )
                        }
                    }

                    // Otherwise, handle a short prediction
                    else {
                        signal = {
                            kind: -1,
                            entry: safe_bid,
                            takeProfit: <number>this._utils.alterNumberByPercentage(
                                safe_bid, 
                                -this._epoch.active.value.model.price_change_requirement,
                                {dp: 0, ru: true}
                            ),
                            stopLoss: <number>this._utils.alterNumberByPercentage(
                                safe_bid, 
                                this._epoch.active.value.model.price_change_requirement,
                                {dp: 0, ru: true}
                            )
                        }
                    }

                    // Broadcast the signal
                    await this._notification.broadcast({
                        sender: "PREDICTION",
                        title: `${signal.kind == 1 ? 'Long': 'Short'} Signal (${pred.s})`,
                        description: `
                        Entry: ${signal.entry}\n
                        Take Profit: ${signal.takeProfit}\n
                        Stop Loss: ${signal.stopLoss}
                        `
                    });
                    this.lastBroadcast = Date.now();
                } catch (e) { console.error(e) }
            }
        });
    }
}