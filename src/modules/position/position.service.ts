import {inject, injectable} from "inversify";
import { Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinancePositionSide, 
    IBinanceService,
} from "../binance";
import { ISignalRecord, ISignalService } from "../signal";
import { IMarketState, IMarketStateService, IStateType } from "../market-state";
import { INotificationService } from "../notification";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    IActivePositionCandlestick,
    IPositionActionKind,
    IPositionActionRecord,
    IPositionGainState,
    IPositionHeadline,
    IPositionModel,
    IPositionRecord,
    IPositionService,
    IPositionStrategy,
    IPositionValidations,
    IPositionInteractions,
    IActivePositions,
    IActivePositionHeadlines,
    IPositionUtilities
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.PositionUtilities)          private _positionUtils: IPositionUtilities;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.SignalService)              private _signal: ISignalService;
    @inject(SYMBOLS.MarketStateService)         private _ms: IMarketStateService;
    @inject(SYMBOLS.NotificationService)        private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    /**
     * Strategy
     * The strategy that will folowed in order to operate.
     */
    public strategy: IPositionStrategy;



    /**
     * Signal
     * A subscription to the active signal records. Whenever signals
     * are broadcasted, positions will be opened if possible.
     */
    private signalSub: Subscription;



    /**
     * Market State
     * A subscription to the market state that will be up-to-date and
     * can be used to reduce positions.
     */
    private currentPrice: number;
    private windowState: IStateType;
    private ms: IMarketState;
    private marketStateSub: Subscription;



    /**
     * Active Positions
     * Epoca is capable of managing up to 9 simultaneous positions. Once 
     * a new position comes into existance, the system builds all the 
     * necessary information, creates a stop-loss order in the exchange
     * and monitors it. When is closed, the payload is stored in both,
     * record and headline format.
     */
    private readonly btcSymbol: string = "BTCUSDT";
    private active: IActivePositions = { LONG: null, SHORT: null };
    private activePositionsSyncInterval: any;
    private readonly activePositionsIntervalSeconds: number = 1.6;



    /**
     * Position Candlesticks
     * In order to be able to analyze the management of active positions,
     * the entire history is stored in candlestick format. A candlestick
     * record contains the following data:
     * 0 -> Mark Price
     * 1 -> Gain%
     * 2 -> Gain Drawdown%
     */
    private activeCandlestick: {[side: string]: IActivePositionCandlestick|null} = {
        LONG: null,
        SHORT: null
    };
    private readonly candlestickIntervalSeconds: number = 900; // ~15 minutes



    /**
     * Position Interactions
     * If strategy.reopen_if_better_duration_minutes is greater than 0, whenever a position
     * is opened, it stores the price that needs to be bettered, as well as the time in which only 
     * "better" positions can be reopened based on the side.
     */
    private positionInteractions: IPositionInteractions = {
        LONG:  { price: 0, until: 0 },
        SHORT: { price: 0, until: 0 }
    };




    constructor() {}














    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the position module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the strategy
        await this.initializeStrategy();

        // Initialize the active positions
        await this.refreshActivePositions();

        // Subscribe to the signals
        this.signalSub = this._signal.active.subscribe(async (s: ISignalRecord|null) => {
            if (s) {
                try { await this.onNewSignal(s) } 
                catch (e) {
                    console.log(e);
                    this._apiError.log("PositionService.signalSub.onNewSignal", e);
                    this._notification.onNewSignalError(e);
                }
            }
        });

        // Subscribe to the market state
        this.marketStateSub = this._ms.active.subscribe(async (ms: IMarketState) => {
            this.ms = ms;
            this.currentPrice = this.ms.window.w.length ? this.ms.window.w.at(-1).c: 0;
            this.windowState = this.ms.window.ss.s2.s;
        });

        // Initialize the intervals
        this.activePositionsSyncInterval = setInterval(async () => {
            try { await this.refreshActivePositions() } catch (e) { 
                const errMessage: string = this._utils.getErrorMessage(e);
                this._apiError.log("PositionService.interval.refreshActivePositions", errMessage);
                if (!errMessage.includes("recvWindow") && !errMessage.includes("-1021")) {
                    this._notification.onRefreshActivePositionsError(errMessage);
                }
            }
        }, this.activePositionsIntervalSeconds * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.signalSub) this.signalSub.unsubscribe();
        if (this.marketStateSub) this.marketStateSub.unsubscribe();
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
    }
















    /***************************
     * Signal Event Management *
     ***************************/





    /**
     * Triggers whenever there is a new signal. Based on the active 
     * positions and the strategy, determines if the given position
     * should be opened.
     * @param signal 
     * @returns Promise<void>
     */
    private async onNewSignal(signal: ISignalRecord): Promise<void> {
        // Init the side
        const side: IBinancePositionSide = signal.r == 1 ? "LONG": "SHORT";

        /**
         * Only proceed if the following is met:
         * 1) Trading is enabled for the side.
         * 2) There isn't an active position for the side.
         */
        if (
            (side == "LONG" && this.strategy.long_status && !this.active["LONG"]) || 
            (side == "SHORT" && this.strategy.short_status && !this.active["SHORT"])
        ) {
            /**
             * Evaluate if the position can be opened based on the availability of 
             * the side as well as the last interacted price
             */
            let canBeOpened: boolean = true;
            if (
                this.strategy.reopen_if_better_duration_minutes > 0 &&
                this.positionInteractions[side].price != 0 &&
                Date.now() <= this.positionInteractions[side].until
            ) {
                // In the case of a long, the new position's price must be lower than the previous one
                if (side == "LONG") {
                    canBeOpened = this.currentPrice < this.positionInteractions[side].price;
                }

                // In the case of a short, the new position's price must be higher than the previous one
                else {
                    canBeOpened = this.currentPrice > this.positionInteractions[side].price;
                }
            }

            // If the position can be opened, proceed
            if (canBeOpened) {
                // Init the list of tradeable symbols
                let tradeableSymbols: string[] = [];

                // If the Bitcoin Only Strategy is enabled, check if a signal was issued
                if (this.strategy.bitcoin_only && signal.s.includes(this.btcSymbol)) {
                    tradeableSymbols = [ this.btcSymbol ];
                }

                // Otherwise, the multicoin system is enabled
                else if (!this.strategy.bitcoin_only) {
                    tradeableSymbols = signal.s.filter((s) => !this.strategy.low_volatility_coins.includes(s));
                }

                // If possible, open a position for the symbol placed in the first index
                if (tradeableSymbols.length) {
                    await this._positionUtils.openPosition(
                        side, 
                        tradeableSymbols[0],
                        this.strategy.position_size,
                        this.strategy.leverage
                    );
                }
            } else {
                let msg: string = `Warning: The ${side} Position was not opened because the price (${this.currentPrice}) `;
                msg += `is worse than the previous position (${this.positionInteractions[side].price}).`
                console.log(msg);
                this._apiError.log("PositionService.onNewSignal", msg);
            }
        }
    }





















    /*******************************
     * Active Positions Management *
     *******************************/







    /**
     * Retrieves the active position and handles it accordingly.
     * @returns Promise<void>
     */
    private async refreshActivePositions(): Promise<void> {
        // Init the list of errors
        let errors: string[] = [];

        // Retrieve the position
        const positions: IBinanceActivePosition[] = await this._binance.getActivePositions();

        // Init the position event lists
        let newPositions: IBinanceActivePosition[] = [];
        let changedPositions: IBinanceActivePosition[] = [];
        let activeSides: IBinancePositionSide[] = [];

        // Iterate over each position and populate the lists accordingly
        for (let pos of positions) {
            // Check if it is a position change event
            if (this.active[pos.positionSide]) { changedPositions.push(pos) }

            // Check if it is a new position event
            else if (!this.active[pos.positionSide]) { newPositions.push(pos) }

            // Add the side to the active list
            activeSides.push(pos.positionSide);
        }

        // Trigger the position changes event (if any)
        if (changedPositions.length) {
            try {
                await Promise.all(changedPositions.map((pos) => this.onPositionChangesFactory(pos)()));
            } catch (e) {
                console.log(e);
                errors.push(this._utils.getErrorMessage(e));
            }
        }

        // Trigger the new position event (if any)
        if (newPositions.length) {
            try {
                await Promise.all(newPositions.map((pos) => this.onNewPositionFactory(pos)()));
            } catch (e) {
                console.log(e);
                errors.push(this._utils.getErrorMessage(e));
            }
        }

        // Trigger the position closed event if applies
        let closedSides: IBinancePositionSide[] = [];
        if (this.active.LONG && !activeSides.includes("LONG")) { closedSides.push("LONG") }
        if (this.active.SHORT && !activeSides.includes("SHORT")) { closedSides.push("SHORT") }
        if (closedSides.length) {
            try {
                await Promise.all(closedSides.map((side) => this.onPositionCloseFactory(side)()));
            } catch (e) {
                console.log(e);
                errors.push(this._utils.getErrorMessage(e));
            }
        }

        // Re-throw the errors (if any)
        if (errors.length) { throw new Error(errors.join(" | ")) }
    }












    /**
     * When a new position is detected, the following actions are performed:
     * 1) The full position record is built.
     * 2) The system attempts to create the stop-loss order.
     * 3) The candlestick history is initialized.
     * 4) Notifies the users about the position.
     * 5) Ensures the leverage and margin type are correct. Otherwise, it
     * notifies users
     * @param pos 
     * @returns Promise<void>
     */
    private onNewPositionFactory(pos: IBinanceActivePosition): () => Promise<void> {
        return () => this.onNewPosition(pos);
    }
    private async onNewPosition(pos: IBinanceActivePosition): Promise<void> {
        // Build the position record
        this.active[pos.positionSide] = this._positionUtils.buildNewPositionRecord(pos);

        // Initialize the active candlestick
        this.activeCandlestick[pos.positionSide] = this._positionUtils.buildNewActiveCandlestick(
            this.active[pos.positionSide].open,
            this.active[pos.positionSide].mark_price,
            this.active[pos.positionSide].gain,
            this.candlestickIntervalSeconds
        );

        // Attempt to create the stop-loss order
        try {
            this.active[pos.positionSide].stop_loss_order = await this._positionUtils.createStopMarketOrder(
                pos.symbol,
                pos.positionSide,
                Math.abs(this.active[pos.positionSide].position_amount),
                this.active[pos.positionSide].stop_loss_price
            );
        } catch (e) {
            console.log(e);
            this._apiError.log("PositionService.onNewPosition.createStopMarketOrder", e);
        }

        // If reopen_if_better_duration_minutes is enabled, store the interaction data
        if (this.strategy.reopen_if_better_duration_minutes > 0) {
            /**
             * Alter the current price based on the side in order to prevent
             * position reopening on a losing range.
             */
            const adjPrice: number = <number>this._utils.alterNumberByPercentage(
                this.currentPrice,
                this.active[pos.positionSide].side == "LONG" ? 
                    -(this.strategy.reopen_if_better_price_adjustment): this.strategy.reopen_if_better_price_adjustment
            );

            // Finally, store the data
            this.positionInteractions[this.active[pos.positionSide].side] = {
                price: adjPrice,
                until: moment().add(this.strategy.reopen_if_better_duration_minutes, "minutes").valueOf()
            }
        }

        // Notify users if the leverage is missconfigured
        if (this.active[pos.positionSide].leverage != this.strategy.leverage) {
            this._notification.positionHasBeenOpenedWithInvalidLeverage(this.active[pos.positionSide], this.strategy.leverage);
        }

        // Notify users if the margin type is missconfigured
        if (this.active[pos.positionSide].margin_type != "isolated") {
            this._notification.positionHasBeenOpenedWithInvalidMarginType(this.active[pos.positionSide], "isolated");
        }

        // Notify the users about the new position
        this._notification.positionHasBeenOpened(this.active[pos.positionSide]);
    }











    /**
     * Updates a position with the latest data and performs the following:
     * 1) Updates all the mutable properties.
     * 2) Checks if the position has a stop loss order. If not, it attemps to create it.
     * 3) Checks if the position is in a state to claim profits. If so, it closes it.
     * 4) Checks if the position is in a state to take losses. If the stop loss order
     * has not yet triggered, it will be manually closed.
     * @param pos 
     * @returns Promise<void>
     */
    private onPositionChangesFactory(pos: IBinanceActivePosition): () => Promise<void> {
        return () => this.onPositionChanges(pos);
    }
    private async onPositionChanges(pos: IBinanceActivePosition): Promise<void> {
        // Initialize the Mark Price
        const markPrice: number = <number>this._utils.outputNumber(pos.markPrice, {dp: this.active[pos.positionSide].coin.pricePrecision});

        /* Update Position Data */

        // Update general data
        this.active[pos.positionSide].mark_price = markPrice;
        this.active[pos.positionSide].liquidation_price = <number>this._utils.outputNumber(pos.liquidationPrice, {dp: this.active[pos.positionSide].coin.pricePrecision});
        this.active[pos.positionSide].unrealized_pnl = <number>this._utils.outputNumber(pos.unRealizedProfit);
        this.active[pos.positionSide].isolated_wallet = <number>this._utils.outputNumber(pos.isolatedWallet);
        this.active[pos.positionSide].isolated_margin = <number>this._utils.outputNumber(pos.isolatedMargin);
        this.active[pos.positionSide].position_amount = <number>this._utils.outputNumber(pos.positionAmt, { dp: this.active[pos.positionSide].coin.quantityPrecision });
        this.active[pos.positionSide].notional = <number>this._utils.outputNumber(pos.notional);

        // Update gain data
        const gs: IPositionGainState = this._positionUtils.calculateGainState(
            this.active[pos.positionSide].side,
            this.active[pos.positionSide].entry_price,
            this.active[pos.positionSide].mark_price,
            this.active[pos.positionSide].highest_gain
        );
        this.active[pos.positionSide].gain = gs.gain;
        this.active[pos.positionSide].highest_gain = gs.highest_gain;

        // Update history data
        const current_ts: number = Date.now();
        this.activeCandlestick[pos.positionSide].markPrice = this._positionUtils.buildUpdatedCandlestickItem(markPrice, this.activeCandlestick[pos.positionSide].markPrice);
        this.activeCandlestick[pos.positionSide].gain = this._positionUtils.buildUpdatedCandlestickItem(gs.gain, this.activeCandlestick[pos.positionSide].gain);
        if (current_ts >= this.activeCandlestick[pos.positionSide].ct) {
            this.active[pos.positionSide].history.push(this._positionUtils.buildCandlestickRecord(this.activeCandlestick[pos.positionSide]));
            delete this.activeCandlestick[pos.positionSide];
            this.activeCandlestick[pos.positionSide] = this._positionUtils.buildNewActiveCandlestick(current_ts, markPrice, gs.gain, this.candlestickIntervalSeconds);
        }

        /* Check if the position should be closed */
        
        // If the stop loss has been hit, close the position
        if (
            (this.active[pos.positionSide].side == "LONG" && markPrice <= this.active[pos.positionSide].stop_loss_price) ||
            (this.active[pos.positionSide].side == "SHORT" && markPrice >= this.active[pos.positionSide].stop_loss_price)
        ) {
            await this.closePosition(pos.positionSide);
        }

        /**
         * Otherwise, check if a position should be reduced based on
         * the current gain & window states.
         * 1) There must be an active take profit level
         * 2) The window state must be increasing for a LONG or decreasing for a SHORT.
         * 3) The current time must be greater than the next reduction timestamp set by the level.
         */
        else if (
            gs.active_tp_level !== undefined &&
            (
                (pos.positionSide == "LONG" && this.windowState > 0) ||
                (pos.positionSide == "SHORT" && this.windowState < 0)
            ) &&
            (
                !this.active[pos.positionSide].reductions[gs.active_tp_level].length || 
                current_ts >= this.active[pos.positionSide].reductions[gs.active_tp_level].at(-1).nr
            )
        ) { 
            // Calculate the size of the chunk that will be reduced
            const reductionChunkSize: number = this._positionUtils.calculateReductionChunkSize(
                this.currentPrice,
                Math.abs(this.active[pos.positionSide].notional),
                gs.active_tp_level
            );

            // Append the reduction record to the list
            this.active[pos.positionSide].reductions[gs.active_tp_level].push({
                t: current_ts,
                nr: moment().add(this.strategy[gs.active_tp_level].reduction_interval_minutes, "minutes").valueOf(),
                rcz: reductionChunkSize,
                g: gs.gain
            });

            // Execute the reduction
            await this.closePosition(pos.positionSide, reductionChunkSize);
        }
    }










    







    /* On Position Close Event */


    /**
     * When the system detects a position has been closed, it does the following:
     * 1) Adds the active candlestick to the record and saves it as well as the
     * headline.
     * 2) Notifies the users providing basic information regarding the outcome.
     * 3) Unsets the position in the local properties.
     * @param side 
     * @returns Promise<void>
     */
    private onPositionCloseFactory(side: IBinancePositionSide): () => Promise<void> {
        return () => this.onPositionClose(side);
    }
    private async onPositionClose(side: IBinancePositionSide): Promise<void> {
        // Firstly, set the close time on the record
        this.active[side].close = Date.now();

        // Add the active candlestick to the history
        this.active[side].history.push(this._positionUtils.buildCandlestickRecord(this.activeCandlestick[side]));

        // Store the position the db
        await this._model.savePosition(this.active[side]);

        // Notify the users
        this._notification.positionHasBeenClosed(this.active[side]);

        // Finally, clean the position from the local properties
        this.active[side] = null;
        this.activeCandlestick[side] = null;
    }



























    /***********************
     * Position Retrievers *
     ***********************/









    /**
     * Builds the active position headlines object.
     * @returns IActivePositionHeadlines
     */
    public getActivePositionHeadlines(): IActivePositionHeadlines {
        return this._positionUtils.buildActivePositionHeadlines(this.active.LONG, this.active.SHORT);
    }


    




    /**
     * Retrieves a full position record. It checks if the position is 
     * active first. Otherwise, it is retrieved from the db. 
     * Note that if a position is not found, an error will be thrown.
     * Additionally, when retrieving active positions, the active 
     * candlestick will be included to the list.
     * @param id 
     * @returns Promise<IPositionRecord>
     */
    public async getPositionRecord(id: string): Promise<IPositionRecord> {
        // Firstly, validate the request
        this._validations.canPositionRecordBeRetrieved(id);

        // Initialize the record by filtering the active ones
        let record: IPositionRecord|undefined = undefined;
        if (this.active.LONG && this.active.LONG.id == id) { record = this.active.LONG }
        else if (this.active.SHORT && this.active.SHORT.id == id) { record = this.active.SHORT }

        // If the position is active, add the current candlestick to the history
        if (record) {
            // Clone the record prior to adding the candlestick
            let localRecord: IPositionRecord = JSON.parse(JSON.stringify(record));
            localRecord.history.push(this._positionUtils.buildCandlestickRecord(this.activeCandlestick[record.side]));
            return localRecord;
        }

        // If no record was found, retrieve it from the database
        else { 
            return await this._model.getPositionRecord(id) 
        }
    }







    /**
     * Lists all the position headlines for a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionHeadline[]>
     */
    public async listPositionHeadlines(startAt: number, endAt: number): Promise<IPositionHeadline[]> {
        // Validate the request
        this._validations.canPositionHeadlinesBeListed(startAt, endAt);

        // Return the list
        return await this._model.listPositionHeadlines(startAt, endAt);
    }







    /**
     * Lists the position action payloads by kind for a given date range.
     * @param kind 
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionActionRecord[]>
     */
    public async listPositionActionPayloads(
        kind: IPositionActionKind, 
        startAt: number, 
        endAt: number
    ): Promise<IPositionActionRecord[]> {
        // Validate the request
        this._validations.canPositionActionPayloadsBeListed(kind, startAt, endAt);

        // Execute the query
        return await this._model.listPositionActionPayloads(kind, startAt, endAt);
    }

















    


    /********************
     * Position Actions *
     ********************/








    /**
     * Closes an active position based on the given side.
     * @param side 
     * @param chunkSize 
     * @returns Promise<void>
     */
    public async closePosition(side: IBinancePositionSide, chunkSize?: number): Promise<void> {
        return this._positionUtils.closePosition(this.active[side], chunkSize);
    }

























    /********************************
     * Position Strategy Management *
     ********************************/




    /**
     * Initializes the position strategy. In case it hadn't been,
     * it will create it.
     */
    private async initializeStrategy(): Promise<void> {
        // Initialize the strategy from the db (if possible)
        this.strategy = await this._model.getStrategy();
        if (!this.strategy) {
            this.strategy = this._positionUtils.buildDefaultStrategy();
            await this._model.createStrategy(this.strategy);
        }

        // Set the strategy on the utils
        this._positionUtils.strategyChanged(this.strategy);
    }




    /**
     * Updates the current trading strategy.
     * @param newStrategy 
     * @returns Promise<void>
     */
    public async updateStrategy(newStrategy: IPositionStrategy): Promise<void> {
        // Make sure it can be updated
        this._validations.canStrategyBeUpdated(newStrategy);

        // Update the record
        await this._model.updateStrategy(newStrategy);

        // Update the local strategy
        this.strategy = newStrategy;

        // Set the strategy on the utils
        this._positionUtils.strategyChanged(this.strategy);
    }
}
