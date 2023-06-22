import {inject, injectable} from "inversify";
import { Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinancePositionSide, 
    IBinanceService,
} from "../binance";
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
    IActivePositions,
    IActivePositionHeadlines,
    IPositionUtilities,
    IPositionExitStrategy
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.PositionUtilities)          private _positionUtils: IPositionUtilities;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
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
     * Market State
     * A subscription to the market state that will be up-to-date and
     * can be used to reduce positions.
     */
    private currentPrice: number;
    private windowStateS2: IStateType;
    private windowStateS5: IStateType;
    private ms: IMarketState;
    private marketStateSub: Subscription;



    /**
     * Last Reversal ID
     * The reversal module maintains the state until the KeyZone Event fades away.
     * Therefore, the signal module must ensure that the signal is only emitted 
     * once.
     */
    private lastReversalID: number|undefined;


    /**
     * Active Positions
     * Epoca is capable of managing up to 2 positions (1 per side) simultaneous.
     * Additionally, it can increase or close them accordingly.
     */
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
     */
    private activeCandlestick: {[side: string]: IActivePositionCandlestick|null} = {
        LONG: null,
        SHORT: null
    };
    private readonly candlestickIntervalMinutes: number = 240; // ~4 hours




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

        // Subscribe to the market state
        this.marketStateSub = this._ms.active.subscribe(async (ms: IMarketState) => {
            // Populate the general market state values
            this.ms = ms;
            this.currentPrice = this.ms.window.w.length ? this.ms.window.w.at(-1).c: 0;
            this.windowStateS2 = this.ms.window.ss.s2.s;
            this.windowStateS5 = this.ms.window.ss.s5.s;

            /**
             * A reversal state event has taken place if:
             * - There is an active KeyZone Event
             * - There is an active Reversal State and an event has been issued
             * - The Reversal State Event must include BTC in its symbols
             */
            if (
                ms.keyzones.event && 
                (ms.keyzones.event.k == "s" || ms.keyzones.event.k == "r") &&
                (ms.reversal.e && ms.reversal.id != this.lastReversalID) &&
                ms.reversal.e.s.includes(this._positionUtils.btcSymbol)
            ) {
                try { 
                    // Save the ID of the reversal temporarily
                    this.lastReversalID = ms.reversal.id;

                    // Handle the reversal state event
                    await this.onReversalStateEvent(ms.keyzones.event.k  == "s" ? "LONG": "SHORT");
                } 
                catch (e) {
                    console.log(e);
                    this._apiError.log("PositionService.marketStateSub.onReversalStateEvent", e);
                    this._notification.onNewSignalError(e);
                }
            }
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
        if (this.marketStateSub) this.marketStateSub.unsubscribe();
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
    }


















    /********************
     * Position Actions *
     ********************/





    /**
     * Triggers whenever there is a new reversal state. Based on the active 
     * positions and the strategy, determines if the given position
     * should be opened/increased.
     * @param side 
     * @returns Promise<void>
     */
    public async onReversalStateEvent(side: IBinancePositionSide): Promise<void> {
        /**
         * Only proceed if the following is met:
         * 1) Trading is enabled for the side.
         * 2) There isn't an active position for the side or the position
         * is inreaseable.
         */
        if (
            (
                (side == "LONG" && this.strategy.long_status) ||
                (side == "SHORT" && this.strategy.short_status)
            ) &&
            (
                !this.active[side] || 
                this._positionUtils.canSideBeIncreased(
                    side, 
                    this.active[side].entry_price, 
                    this.currentPrice,
                    this.active[side].notional,
                    this.active[side].next_increase
                )
            )
        ) {
            // If the side is being increased, set the date for the next increase
            if (this.active[side]) {
                this.active[side].next_increase = moment().add(this.strategy.side_increase_idle_hours, "hours").valueOf()
            }

            // Open the position
            await this._positionUtils.openPosition(side);
        }
    }
    








    /**
     * Closes an active position based on the given side.
     * @param side 
     * @param chunkSize 
     * @returns Promise<void>
     */
    public async closePosition(side: IBinancePositionSide, chunkSize?: number): Promise<void> {
        return this._positionUtils.closePosition(this.active[side], chunkSize);
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









    
    /* On Position Open Event */




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
            this.candlestickIntervalMinutes
        );

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









    /* On Position Change Event */




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
        this.active[pos.positionSide].entry_price = <number>this._utils.outputNumber(pos.entryPrice, {dp: this.active[pos.positionSide].coin.pricePrecision});
        this.active[pos.positionSide].liquidation_price = <number>this._utils.outputNumber(pos.liquidationPrice, {dp: this.active[pos.positionSide].coin.pricePrecision});
        this.active[pos.positionSide].unrealized_pnl = <number>this._utils.outputNumber(pos.unRealizedProfit);
        this.active[pos.positionSide].isolated_wallet = <number>this._utils.outputNumber(pos.isolatedWallet);
        this.active[pos.positionSide].isolated_margin = <number>this._utils.outputNumber(pos.isolatedMargin);
        this.active[pos.positionSide].position_amount = <number>this._utils.outputNumber(pos.positionAmt, { dp: this.active[pos.positionSide].coin.quantityPrecision });
        this.active[pos.positionSide].notional = <number>this._utils.outputNumber(pos.notional);

        // Update the exit strategy
        const exit: IPositionExitStrategy = this._positionUtils.calculatePositionExitStrategy(
            pos.positionSide, 
            this.active[pos.positionSide].entry_price, 
            this.active[pos.positionSide].coin.pricePrecision
        );
        this.active[pos.positionSide].take_profit_price_1 = exit.take_profit_price_1;
        this.active[pos.positionSide].take_profit_price_2 = exit.take_profit_price_2;
        this.active[pos.positionSide].take_profit_price_3 = exit.take_profit_price_3;
        this.active[pos.positionSide].take_profit_price_4 = exit.take_profit_price_4;
        this.active[pos.positionSide].take_profit_price_5 = exit.take_profit_price_5;

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
            this.activeCandlestick[pos.positionSide] = this._positionUtils.buildNewActiveCandlestick(current_ts, markPrice, gs.gain, this.candlestickIntervalMinutes);
        }


        /**
         * Check if a position should be reduced based on the current gain & window states.
         * 1) There must be an active take profit level
         * 2) The window state must be increasing for a LONG or decreasing for a SHORT.
         * 3) The current time must be greater than the next reduction timestamp set by the level.
         */
        if (
            gs.active_tp_level !== undefined &&
            (
                (pos.positionSide == "LONG" && this.windowStateS2 > 0 && this.windowStateS5 > 0) ||
                (pos.positionSide == "SHORT" && this.windowStateS2 < 0 && this.windowStateS5 < 0)
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
