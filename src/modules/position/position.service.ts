import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinancePositionActionSide, 
    IBinancePositionSide, 
    IBinanceService,
    IBinanceTradeExecutionPayload, 
} from "../binance";
import { ISignalRecord, ISignalService } from "../signal";
import { ICoin, ICoinsService } from "../market-state";
import { INotificationService } from "../notification";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    IActivePositionCandlestick,
    IPositionActionKind,
    IPositionActionRecord,
    IPositionCandlestick,
    IPositionCandlestickRecord,
    IPositionExitStrategy,
    IPositionGainState,
    IPositionHeadline,
    IPositionModel,
    IPositionRecord,
    IPositionService,
    IPositionStrategy,
    IPositionValidations,
    IPositionInteractions,
    IActivePositions,
    IActivePositionHeadlines
} from "./interfaces";
import { ICandlestickService } from "../candlestick";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.SignalService)              private _signal: ISignalService;
    @inject(SYMBOLS.CoinsService)               private _coin: ICoinsService;
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
            // Init the current price
            let currentPrice: number = 0;

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
                // Init the current price
                currentPrice = this._candlestick.predictionLookback.at(-1).c;

                // In the case of a long, the new position's price must be lower than the previous one
                if (side == "LONG") {
                    canBeOpened = currentPrice < this.positionInteractions[side].price;
                }

                // In the case of a short, the new position's price must be higher than the previous one
                else {
                    canBeOpened = currentPrice > this.positionInteractions[side].price;
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
                if (tradeableSymbols.length) await this.openPosition(side, tradeableSymbols[0]);
            } else {
                let msg: string = `Warning: The ${side} Position was not opened because the price (${currentPrice}) `;
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







    /* On New Position Event */


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
        this.active[pos.positionSide] = this.buildNewPositionRecord(pos);

        // Initialize the active candlestick
        this.activeCandlestick[pos.positionSide] = this.buildNewActiveCandlestick(
            this.active[pos.positionSide].open,
            this.active[pos.positionSide].mark_price,
            this.active[pos.positionSide].gain,
            this.active[pos.positionSide].gain_drawdown
        );

        // Attempt to create the stop-loss order
        try {
            this.active[pos.positionSide].stop_loss_order = await this.createStopMarketOrder(
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
             * Alter the stop loss price based on the side in order to prevent
             * position reopening on a losing range.
             */
            const adjPrice: number = <number>this._utils.alterNumberByPercentage(
                this._candlestick.predictionLookback.at(-1).c,
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
     * Builds a Position Record for a brand new position.
     * @param pos 
     * @returns IPositionRecord
     */
    private buildNewPositionRecord(pos: IBinanceActivePosition): IPositionRecord {
        // Retrieve the coin
        const coin: ICoin = this._coin.getInstalledCoin(pos.symbol);

        // Initialize the position amount
        const positionAmount: number = <number>this._utils.outputNumber(pos.positionAmt, { dp: coin.quantityPrecision });

        // Initialize the entry price and put the exit prices strategy together
        const entryPrice: number = <number>this._utils.outputNumber(pos.entryPrice, {dp: coin.pricePrecision});
        const exit: IPositionExitStrategy = this.calculatePositionExitStrategy(pos.positionSide, entryPrice, coin.pricePrecision);

        // Finally, return the build
        return {
            // General Data
            id: this._utils.generateID(),
            open: Date.now(),
            close: undefined,
            coin: coin,
            side: pos.positionSide,
            leverage: Number(pos.leverage),
            margin_type: pos.marginType,
            mark_price: <number>this._utils.outputNumber(pos.markPrice, {dp: coin.pricePrecision}),
            entry_price: entryPrice,
            liquidation_price: <number>this._utils.outputNumber(pos.liquidationPrice, {dp: coin.pricePrecision}),
            unrealized_pnl: <number>this._utils.outputNumber(pos.unRealizedProfit),
            isolated_wallet: <number>this._utils.outputNumber(pos.isolatedWallet),
            isolated_margin: <number>this._utils.outputNumber(pos.isolatedMargin),
            position_amount: positionAmount,
            notional: <number>this._utils.outputNumber(pos.notional),

            // Exit Strategy Data
            take_profit_price_1: exit.take_profit_price_1,
            take_profit_price_2: exit.take_profit_price_2,
            take_profit_price_3: exit.take_profit_price_3,
            take_profit_price_4: exit.take_profit_price_4,
            take_profit_price_5: exit.take_profit_price_5,
            reductions: {
                take_profit_1: false,
                take_profit_2: false,
                take_profit_3: false,
                take_profit_4: false,
                take_profit_5: false,
            },
            stop_loss_price: exit.stop_loss_price,
            stop_loss_order: undefined,

            // Gain Data
            gain: 0,
            highest_gain: 0,
            gain_drawdown: 0,

            // History
            history: []
        }
    }




    /**
     * Calculates the exit strategy prices for a position based on
     * its side and the entry.
     * @param side 
     * @param entryPrice 
     * @param pricePrecision 
     * @returns IPositionExitStrategy
     */
    private calculatePositionExitStrategy(side: IBinancePositionSide, entryPrice: number, pricePrecision: number): IPositionExitStrategy {
        return {
            take_profit_price_1: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? this.strategy.take_profit_1.price_change_requirement: -(this.strategy.take_profit_1.price_change_requirement),
                { dp: pricePrecision }
            ),
            take_profit_price_2: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? this.strategy.take_profit_2.price_change_requirement: -(this.strategy.take_profit_2.price_change_requirement),
                { dp: pricePrecision }
            ),
            take_profit_price_3: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? this.strategy.take_profit_3.price_change_requirement: -(this.strategy.take_profit_3.price_change_requirement),
                { dp: pricePrecision }
            ),
            take_profit_price_4: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? this.strategy.take_profit_4.price_change_requirement: -(this.strategy.take_profit_4.price_change_requirement),
                { dp: pricePrecision }
            ),
            take_profit_price_5: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? this.strategy.take_profit_5.price_change_requirement: -(this.strategy.take_profit_5.price_change_requirement),
                { dp: pricePrecision }
            ),
            stop_loss_price: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? -(this.strategy.stop_loss): this.strategy.stop_loss,
                { dp: pricePrecision }
            )
        }
    }













    /* On Position Changes Event */


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
        const gs: IPositionGainState = this.calculateGainState(
            this.active[pos.positionSide].side,
            this.active[pos.positionSide].entry_price,
            this.active[pos.positionSide].mark_price,
            this.active[pos.positionSide].highest_gain
        );
        this.active[pos.positionSide].gain = gs.gain;
        this.active[pos.positionSide].highest_gain = gs.highest_gain;
        this.active[pos.positionSide].gain_drawdown = gs.gain_drawdown;

        // Update history data
        const current_ts: number = Date.now();
        this.activeCandlestick[pos.positionSide].markPrice = this.buildUpdatedCandlestickItem(markPrice, this.activeCandlestick[pos.positionSide].markPrice);
        this.activeCandlestick[pos.positionSide].gain = this.buildUpdatedCandlestickItem(gs.gain, this.activeCandlestick[pos.positionSide].gain);
        this.activeCandlestick[pos.positionSide].gainDrawdown = this.buildUpdatedCandlestickItem(gs.gain_drawdown, this.activeCandlestick[pos.positionSide].gainDrawdown);
        if (current_ts >= this.activeCandlestick[pos.positionSide].ct) {
            this.active[pos.positionSide].history.push(this.buildCandlestickRecord(this.activeCandlestick[pos.positionSide]));
            delete this.activeCandlestick[pos.positionSide];
            this.activeCandlestick[pos.positionSide] = this.buildNewActiveCandlestick(current_ts, markPrice, gs.gain, gs.gain_drawdown);
        }

        /* Check if the position should be closed */
        
        // If the stop loss has been hit, close the position
        if (
            (this.active[pos.positionSide].side == "LONG" && markPrice <= this.active[pos.positionSide].stop_loss_price) ||
            (this.active[pos.positionSide].side == "SHORT" && markPrice >= this.active[pos.positionSide].stop_loss_price)
        ) {
            await this.closePosition(pos.positionSide);
        }

        // If any take profit level has been broken, close the position
        else if (this.hasBrokenTakeProfitLevel(gs.gain, gs.highest_gain)) {
            await this.closePosition(pos.positionSide);
        }

        // If the take profit level's gain drawdown% limit has been exceeded, close the position
        else if (gs.gain_drawdown <= this.calculateMaxGainDrawdown(gs.gain)) {
            await this.closePosition(pos.positionSide);
        }

        // Evaluate if the position should be reduced
        else if (
            this.strategy.take_profit_1.reduction_size_on_contact > 0 &&
            !this.active[pos.positionSide].reductions.take_profit_1 &&
            (gs.gain >= this.strategy.take_profit_1.price_change_requirement && gs.gain < this.strategy.take_profit_2.price_change_requirement)
        ) { 
            this.active[pos.positionSide].reductions.take_profit_1 = true;
            await this.closePosition(pos.positionSide, this.strategy.take_profit_1.reduction_size_on_contact);
        }
        else if (
            this.strategy.take_profit_2.reduction_size_on_contact > 0 &&
            !this.active[pos.positionSide].reductions.take_profit_2 &&
            (gs.gain >= this.strategy.take_profit_2.price_change_requirement && gs.gain < this.strategy.take_profit_3.price_change_requirement)
        ) { 
            this.active[pos.positionSide].reductions.take_profit_2 = true;
            await this.closePosition(pos.positionSide, this.strategy.take_profit_2.reduction_size_on_contact);
        }
        else if (
            this.strategy.take_profit_3.reduction_size_on_contact > 0 &&
            !this.active[pos.positionSide].reductions.take_profit_3 &&
            (gs.gain >= this.strategy.take_profit_3.price_change_requirement && gs.gain < this.strategy.take_profit_4.price_change_requirement)
        ) { 
            this.active[pos.positionSide].reductions.take_profit_3 = true;
            await this.closePosition(pos.positionSide, this.strategy.take_profit_3.reduction_size_on_contact);
        }
        else if (
            this.strategy.take_profit_4.reduction_size_on_contact > 0 &&
            !this.active[pos.positionSide].reductions.take_profit_4 &&
            (gs.gain >= this.strategy.take_profit_4.price_change_requirement && gs.gain < this.strategy.take_profit_5.price_change_requirement)
        ) { 
            this.active[pos.positionSide].reductions.take_profit_4 = true;
            await this.closePosition(pos.positionSide, this.strategy.take_profit_4.reduction_size_on_contact);
        }
        else if (
            this.strategy.take_profit_5.reduction_size_on_contact > 0 &&
            !this.active[pos.positionSide].reductions.take_profit_5 &&
            gs.gain >= this.strategy.take_profit_5.price_change_requirement
        ) { 
            this.active[pos.positionSide].reductions.take_profit_5 = true;
            await this.closePosition(pos.positionSide, this.strategy.take_profit_5.reduction_size_on_contact);
        }
    }









    /**
     * Calculates the gain state of a given position.
     * @param side 
     * @param entryPrice 
     * @param markPrice 
     * @param highestGain 
     * @returns IPositionGainState
     */
    private calculateGainState(
        side: IBinancePositionSide, 
        entryPrice: number,
        markPrice: number,
        highestGain: number,
    ): IPositionGainState {
        // Init values
        let gain: number = 0;
        let highest_gain: number = highestGain;
        let gain_drawdown: number = 0;

        // Calculate the current gain based on a long position
        if (side == "LONG") {
            gain = <number>this._utils.calculatePercentageChange(entryPrice, markPrice);
        }

        // Calculate the gain based on a short position
        else {
            gain = <number>this._utils.calculatePercentageChange(markPrice, entryPrice);
        }

        // Check if the position is currently in profit
        if (gain > 0) {
            // Check if the gain is the highest yet
            highest_gain = gain > highest_gain ? gain: highest_gain;

            // If any of the take profit levels is active, calculate the gain drawdown
            if (gain >= this.strategy.take_profit_1.price_change_requirement) {
                gain_drawdown = <number>this._utils.calculatePercentageChange(highest_gain, gain);
            }
        }

        // Finally, return the state
        return { gain: gain, highest_gain: highest_gain, gain_drawdown: gain_drawdown }
    }






    /**
     * Based on the current and highest gain, it will determine if any of the
     * take profit levels have been broken.
     * @param currentGain 
     * @param highestGain 
     * @returns boolean
     */
    private hasBrokenTakeProfitLevel(currentGain: number, highestGain: number): boolean {
        return (
            currentGain < this.strategy.take_profit_1.price_change_requirement && 
            highestGain >= (this.strategy.take_profit_1.price_change_requirement + this.strategy.take_profit_1.activation_offset)
        ) ||
        (
            currentGain < this.strategy.take_profit_2.price_change_requirement && 
            highestGain >= (this.strategy.take_profit_2.price_change_requirement + this.strategy.take_profit_2.activation_offset)
        ) ||
        (
            currentGain < this.strategy.take_profit_3.price_change_requirement && 
            highestGain >= (this.strategy.take_profit_3.price_change_requirement + this.strategy.take_profit_3.activation_offset)
        ) ||
        (
            currentGain < this.strategy.take_profit_4.price_change_requirement && 
            highestGain >= (this.strategy.take_profit_4.price_change_requirement + this.strategy.take_profit_4.activation_offset)
        ) ||
        (
            currentGain < this.strategy.take_profit_5.price_change_requirement && 
            highestGain >= (this.strategy.take_profit_5.price_change_requirement + this.strategy.take_profit_5.activation_offset)
        );
    }






    /**
     * Calculates the gain drawdown% limit based on the position's gain.
     * @param gain 
     * @returns number
     */
    private calculateMaxGainDrawdown(gain: number): number {
        // Level 1
        if (
            gain >= this.strategy.take_profit_1.price_change_requirement && gain < this.strategy.take_profit_2.price_change_requirement
        ) {
            return this.strategy.take_profit_1.max_gain_drawdown;
        }

        // Level 2
        else if (
            gain >= this.strategy.take_profit_2.price_change_requirement && gain < this.strategy.take_profit_3.price_change_requirement
        ) {
            return this.strategy.take_profit_2.max_gain_drawdown;
        }

        // Level 3
        else if (
            gain >= this.strategy.take_profit_3.price_change_requirement && gain < this.strategy.take_profit_4.price_change_requirement
        ) {
            return this.strategy.take_profit_3.max_gain_drawdown;
        }

        // Level 4
        else if (
            gain >= this.strategy.take_profit_4.price_change_requirement && gain < this.strategy.take_profit_5.price_change_requirement
        ) {
            return this.strategy.take_profit_4.max_gain_drawdown;
        }

        // Level 5
        else if (gain >= this.strategy.take_profit_5.price_change_requirement) {
            return this.strategy.take_profit_5.max_gain_drawdown;
        }

        // No level is active
        else { return -100 }
    }










    /**
     * Updates a partial candlestick item with the new data
     * @param currentValue 
     * @param item 
     * @returns Partial<IPositionCandlestick>
     */
    private buildUpdatedCandlestickItem(currentValue: number, item: Partial<IPositionCandlestick>): Partial<IPositionCandlestick> {
        return {
            o: item.o,
            h: currentValue > item.h ? currentValue: item.h,
            l: currentValue < item.l ? currentValue: item.l,
            c: currentValue
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
        this.active[side].history.push(this.buildCandlestickRecord(this.activeCandlestick[side]));

        // Store the position the db
        await this._model.savePosition(this.active[side]);

        // Notify the users
        this._notification.positionHasBeenClosed(this.active[side]);

        // Finally, clean the position from the local properties
        this.active[side] = null;
        this.activeCandlestick[side] = null;
    }












    /* Position Management Helpers */








    /**
     * Builds a packed candlestick record from an active one.
     * @param active 
     * @returns IPositionCandlestickRecord
     */
    private buildCandlestickRecord(active: IActivePositionCandlestick): IPositionCandlestickRecord {
        return {
            ot: active.ot,
            d: {
                o: [ active.markPrice.o, active.gain.o, active.gainDrawdown.o ],
                h: [ active.markPrice.h, active.gain.h, active.gainDrawdown.h ],
                l: [ active.markPrice.l, active.gain.l, active.gainDrawdown.l ],
                c: [ active.markPrice.c, active.gain.c, active.gainDrawdown.c ],
            }
        }
    }







    /**
     * Builds a brand new active candlestick ready to be attached
     * to a symbol.
     * @param openTime 
     * @param markPrice 
     * @param gain 
     * @param gainDrawdown 
     * @returns IActivePositionCandlestick
     */
    private buildNewActiveCandlestick(
        openTime: number, 
        markPrice: number, 
        gain: number, 
        gainDrawdown: number
    ): IActivePositionCandlestick {
        return {
            ot: openTime,
            ct: moment(openTime).add(this.candlestickIntervalSeconds, "seconds").valueOf() - 1,
            markPrice: { o: markPrice, h: markPrice, l: markPrice, c: markPrice},
            gain: { o: gain, h: gain, l: gain, c: gain},
            gainDrawdown: { o: gainDrawdown, h: gainDrawdown, l: gainDrawdown, c: gainDrawdown},
        }
    }
























    /***********************
     * Position Retrievers *
     ***********************/









    /**
     * Builds a list with the active position headlines.
     * @returns IActivePositionHeadlines
     */
    public getActivePositionHeadlines(): IActivePositionHeadlines {
        return {
            LONG: this.active.LONG ? {
                id: this.active.LONG.id, 
                o: this.active.LONG.open,
                s: this.active.LONG.coin.symbol, 
                sd: this.active.LONG.side,
                g: this.active.LONG.gain,
                gd: this.active.LONG.gain_drawdown,
                slo: this.active.LONG.stop_loss_order && typeof this.active.LONG.stop_loss_order == "object" ? true: false
            }: null,
            SHORT: this.active.SHORT ? {
                id: this.active.SHORT.id, 
                o: this.active.SHORT.open,
                s: this.active.SHORT.coin.symbol, 
                sd: this.active.SHORT.side,
                g: this.active.SHORT.gain,
                gd: this.active.SHORT.gain_drawdown,
                slo: this.active.SHORT.stop_loss_order && typeof this.active.SHORT.stop_loss_order == "object" ? true: false
            }: null,
        };
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
            localRecord.history.push(this.buildCandlestickRecord(this.activeCandlestick[record.side]));
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
     * Opens a new position for a provided symbol on the given side.
     * @param side 
     * @param symbol 
     * @returns Promise<void>
     */
    /*private openPositionFactory(side: IBinancePositionSide, symbol: string): () => Promise<void> {
        return () => this.openPosition(side, symbol);
    }*/
    private async openPosition(side: IBinancePositionSide, symbol: string): Promise<void> {
        // Firstly, retrieve the coin and the price
        const { coin, price } = this._coin.getInstalledCoinAndPrice(symbol);

        // Calculate the notional size
        const notional: BigNumber = new BigNumber(this.strategy.position_size).times(this.strategy.leverage);

        // Convert the notional into the coin, resulting in the leveraged position amount
        const amount: number = <number>this._utils.outputNumber(notional.dividedBy(price), {dp: coin.quantityPrecision, ru: false});

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload|undefined = await this._binance.order(
            symbol,
            side,
            side == "LONG" ? "BUY": "SELL",
            amount
        );

        // Store the payload if provided
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload("POSITION_OPEN", symbol, side, payload);
        }
    }








    /**
     * Closes an active position based on the given side.
     * @param side 
     * @param chunkSize 
     * @returns Promise<void>
     */
    public async closePosition(side: IBinancePositionSide, chunkSize?: number): Promise<void> {
        // Firstly, make sure there is an active position for the given side
        if (!this.active[side]) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be closed because there isnt an active one.`, 29000));
        }

        // Initialize the chunk size in case it wasn't provided
        chunkSize = typeof chunkSize == "number" ? chunkSize: 1;

        // Calculate the position amount
        const positionAmount: number = <number>this._utils.outputNumber(
            new BigNumber(Math.abs(this.active[side].position_amount)).times(chunkSize),
            { dp: this.active[side].coin.quantityPrecision, ru: false}
        );

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload|undefined = await this._binance.order(
            this.active[side].coin.symbol,
            side,
            side == "LONG" ? "SELL": "BUY",
            positionAmount
        );

        // Store the position action payload
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload(
                "POSITION_CLOSE", 
                this.active[side].coin.symbol, 
                side, 
                payload
            );
        }
    }







    /**
     * Attempts to create a STOP_MARKET order for a given symbol. Once it 
     * completes, it returns the execution payload if returned by Binance.
     * @param symbol 
     * @param side 
     * @param quantity 
     * @param stopPrice 
     * @returns Promise<IBinanceTradeExecutionPayload|undefined>
     */
    private async createStopMarketOrder(
        symbol: string, 
        side: IBinancePositionSide, 
        quantity: number,
        stopPrice: number
    ): Promise<IBinanceTradeExecutionPayload|undefined> {
        // Derive the action side from the position side
        let actionSide: IBinancePositionActionSide = side == "LONG" ? "SELL": "BUY";

        // Attempt to create the stop loss order in a persistant way
        try { return await this._binance.order(symbol, side, actionSide, quantity, stopPrice) }
        catch (e) {
            console.log(`1/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
            await this._utils.asyncDelay(3);
            try { return await this._binance.order(symbol, side, actionSide, quantity, stopPrice) }
            catch (e) {
                console.log(`2/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
                await this._utils.asyncDelay(5);
                try { return await this._binance.order(symbol, side, actionSide, quantity, stopPrice) }
                catch (e) {
                    console.log(`3/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
                    await this._utils.asyncDelay(7);
                    return await this._binance.order(symbol, side, actionSide, quantity, stopPrice);
                }
            }
        }
    }



















    /********************************
     * Position Strategy Management *
     ********************************/




    /**
     * Initializes the position strategy. In case it hadn't been,
     * it will create it.
     */
    private async initializeStrategy(): Promise<void> {
        this.strategy = await this._model.getStrategy();
        if (!this.strategy) {
            this.strategy = this.getDefaultStrategy();
            await this._model.createStrategy(this.strategy);
        }
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
    }







    /**
     * Builds the default strategy object in case it hasn't 
     * yet been initialized.
     * @returns IPositionStrategy
     */
    private getDefaultStrategy(): IPositionStrategy {
        return {
            long_status: false,
            short_status: false,
            bitcoin_only: true,
            leverage: 110,
            position_size: 5,
            take_profit_1: { price_change_requirement: 0.30, activation_offset: 0.15,   max_gain_drawdown: -100, reduction_size_on_contact: 0 },
            take_profit_2: { price_change_requirement: 0.55, activation_offset: 0.125,  max_gain_drawdown: -100, reduction_size_on_contact: 0 },
            take_profit_3: { price_change_requirement: 0.75, activation_offset: 0.10,   max_gain_drawdown: -100, reduction_size_on_contact: 0.15 },
            take_profit_4: { price_change_requirement: 0.90, activation_offset: 0.075,  max_gain_drawdown: -15,  reduction_size_on_contact: 0.20 },
            take_profit_5: { price_change_requirement: 1.25, activation_offset: 0.05,   max_gain_drawdown: -5,   reduction_size_on_contact: 0.25 },
            stop_loss: 0.6,
            reopen_if_better_duration_minutes: 180,
            reopen_if_better_price_adjustment: 0.35,
            low_volatility_coins: [
                "BTCUSDT", "BNBUSDT", "ADAUSDT", "BCHUSDT", "ETHUSDT", "XRPUSDT", "TRXUSDT", "SOLUSDT"
            ]
        }
    }
}
