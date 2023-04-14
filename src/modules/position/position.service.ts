import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinanceBalance, 
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
    IAccountBalance,
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
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
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
    private active: {[symbol: string]: IPositionRecord} = {};
    private queuedPositions: number = 0;
    private activePositionsSyncInterval: any;
    private readonly activePositionsIntervalSeconds: number = 2; // Every ~2 seconds



    /**
     * Position Candlesticks
     * In order to be able to analyze the management of active positions,
     * the entire history is stored in candlestick format. A candlestick
     * record contains the following data:
     * 0 -> Mark Price
     * 1 -> Gain%
     * 2 -> Gain Drawdown%
     */
    private activeCandlestick: {[symbol: string]: IActivePositionCandlestick} = {};
    private readonly candlestickIntervalSeconds: number = 300; // ~5 minutes




    /**
     * Futures Account Balance
     * In order for members to be trully involved, the balance is synced
     * every certain period of time.
     */
    public balance: IAccountBalance;
    private balanceSyncInterval: any;
    private readonly balanceIntervalSeconds: number = 60 * 180; // Every ~3 hours







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
        // Initialize the default balance
        this.setDefaultBalance();

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
        this.balanceSyncInterval = setInterval(async () => {
            try { await this.refreshBalance() } catch (e) { 
                this._apiError.log("PositionService.interval.refreshBalance", e);
                this.setDefaultBalance();
            }
        }, this.balanceIntervalSeconds * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.signalSub) this.signalSub.unsubscribe();
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
    }
















    /***************************
     * Signal Event Management *
     ***************************/





    /**
     * Triggers whenever there is a new signal. Based on the active 
     * positions and the strategy, determines if the given positions
     * should be opened.
     * @param signal 
     * @returns Promise<void>
     */
    private async onNewSignal(signal: ISignalRecord): Promise<void> {
        // Calculate the number of active positions
        const activeNum: number = Object.keys(this.active).length + this.queuedPositions;

        // Only proceed if position slots are available and the trading strategy allows it
        if (
            activeNum < this.strategy.positions_limit &&
            ((signal.r == 1 && this.strategy.long_status) || (signal.r == -1 && this.strategy.short_status))
        ) {
            // Calculate the number of positions that can be opened
            const availableSlots: number = this.strategy.positions_limit - activeNum;

            // Init the list of tradeable symbols
            let tradeableSymbols: string[] = [];

            // If the Bitcoin Only Strategy is enabled, check if a signal was issued
            if (this.strategy.bitcoin_only && signal.s.includes(this.btcSymbol) && !this.active[this.btcSymbol]) {
                tradeableSymbols = [ this.btcSymbol ];
            }

            // Otherwise, the multicoin system is enabled
            else if (!this.strategy.bitcoin_only) {
                tradeableSymbols = signal.s.filter((s) => !this.active[s]).slice(0, availableSlots);
            }

            // Ensure there are tradeable symbols before proceeding
            if (tradeableSymbols.length) {
                // Increment the queued positions
                this.queuedPositions += tradeableSymbols.length;

                // Execute the position opening for all the tradeable symbols
                await Promise.all(
                    tradeableSymbols.map(
                        (symbol) => this.openPositionFactory(signal.r == 1 ? "LONG": "SHORT", symbol)()
                    )
                );
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
        let activeSymbols: string[] = [];

        // Iterate over each position and populate the lists accordingly
        for (let pos of positions) {
            // Check if it is a position change event
            if (this.active[pos.symbol]) { changedPositions.push(pos) }

            // Check if it is a new position event
            else if (!this.active[pos.symbol]) { newPositions.push(pos) }

            // Add the symbol to the active list
            activeSymbols.push(pos.symbol);
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
        const closedPositionSymbols: string[] = Object.keys(this.active).filter(x => !activeSymbols.includes(x));
        if (closedPositionSymbols.length) {
            try {
                await Promise.all(closedPositionSymbols.map((symbol) => this.onPositionCloseFactory(symbol)()));
            } catch (e) {
                console.log(e);
                errors.push(this._utils.getErrorMessage(e));
            }
        }

        // Reset the queued positions
        this.queuedPositions = 0;

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
        this.active[pos.symbol] = this.buildNewPositionRecord(pos);

        // Initialize the active candlestick
        this.activeCandlestick[pos.symbol] = this.buildNewActiveCandlestick(
            this.active[pos.symbol].open,
            this.active[pos.symbol].mark_price,
            this.active[pos.symbol].gain,
            this.active[pos.symbol].gain_drawdown
        );

        // Attempt to create the stop-loss order @TODO
        try {
            this.active[pos.symbol].stop_loss_order = await this.createStopMarketOrder(
                pos.symbol,
                this.active[pos.symbol].side,
                Math.abs(this.active[pos.symbol].position_amount),
                this.active[pos.symbol].stop_loss_price
            );
        } catch (e) {
            console.log(e);
            this._apiError.log("PositionService.onNewPosition.createStopMarketOrder", e);
        }

        // Notify users if the leverage is missconfigured
        if (this.active[pos.symbol].leverage != this.strategy.leverage) {
            this._notification.positionHasBeenOpenedWithInvalidLeverage(this.active[pos.symbol], this.strategy.leverage);
        }

        // Notify users if the margin type is missconfigured
        if (this.active[pos.symbol].margin_type != "isolated") {
            this._notification.positionHasBeenOpenedWithInvalidMarginType(this.active[pos.symbol], "isolated");
        }

        // Notify the users about the new position
        this._notification.positionHasBeenOpened(this.active[pos.symbol]);
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

        // Initialize the side of the position
        const side: IBinancePositionSide = positionAmount > 0 ? "LONG": "SHORT";

        // Initialize the entry price and put the exit prices strategy together
        const entryPrice: number = <number>this._utils.outputNumber(pos.entryPrice, {dp: coin.pricePrecision});
        const exit: IPositionExitStrategy = this.calculatePositionExitStrategy(side, entryPrice, coin.pricePrecision);

        // Finally, return the build
        return {
            // General Data
            id: this._utils.generateID(),
            open: Date.now(),
            close: undefined,
            coin: coin,
            side: side,
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
        const markPrice: number = <number>this._utils.outputNumber(pos.markPrice, {dp: this.active[pos.symbol].coin.pricePrecision});

        /* Update Position Data */

        // Update general data
        this.active[pos.symbol].mark_price = markPrice;
        this.active[pos.symbol].liquidation_price = <number>this._utils.outputNumber(pos.liquidationPrice, {dp: this.active[pos.symbol].coin.pricePrecision});
        this.active[pos.symbol].unrealized_pnl = <number>this._utils.outputNumber(pos.unRealizedProfit);
        this.active[pos.symbol].isolated_wallet = <number>this._utils.outputNumber(pos.isolatedWallet);
        this.active[pos.symbol].isolated_margin = <number>this._utils.outputNumber(pos.isolatedMargin);
        this.active[pos.symbol].position_amount = <number>this._utils.outputNumber(pos.positionAmt, { dp: this.active[pos.symbol].coin.quantityPrecision });
        this.active[pos.symbol].notional = <number>this._utils.outputNumber(pos.notional);

        // Update gain data
        const gs: IPositionGainState = this.calculateGainState(
            this.active[pos.symbol].side,
            this.active[pos.symbol].entry_price,
            this.active[pos.symbol].mark_price,
            this.active[pos.symbol].highest_gain
        );
        this.active[pos.symbol].gain = gs.gain;
        this.active[pos.symbol].highest_gain = gs.highest_gain;
        this.active[pos.symbol].gain_drawdown = gs.gain_drawdown;

        // Update history data
        const current_ts: number = Date.now();
        this.activeCandlestick[pos.symbol].markPrice = this.buildUpdatedCandlestickItem(markPrice, this.activeCandlestick[pos.symbol].markPrice);
        this.activeCandlestick[pos.symbol].gain = this.buildUpdatedCandlestickItem(gs.gain, this.activeCandlestick[pos.symbol].gain);
        this.activeCandlestick[pos.symbol].gainDrawdown = this.buildUpdatedCandlestickItem(gs.gain_drawdown, this.activeCandlestick[pos.symbol].gainDrawdown);
        if (current_ts >= this.activeCandlestick[pos.symbol].ct) {
            this.active[pos.symbol].history.push(this.buildCandlestickRecord(this.activeCandlestick[pos.symbol]));
            delete this.activeCandlestick[pos.symbol];
            this.activeCandlestick[pos.symbol] = this.buildNewActiveCandlestick(current_ts, markPrice, gs.gain, gs.gain_drawdown);
        }

        /* Check if the position should be closed */
        
        // If the stop loss has been hit, close the position
        if (
            (this.active[pos.symbol].side == "LONG" && markPrice <= this.active[pos.symbol].stop_loss_price) ||
            (this.active[pos.symbol].side == "SHORT" && markPrice >= this.active[pos.symbol].stop_loss_price)
        ) {
            await this.closePosition(pos.symbol);
        }

        // If any take profit level has been broken, close the position
        else if (this.hasBrokenTakeProfitLevel(gs.gain, gs.highest_gain)) {
            await this.closePosition(pos.symbol);
        }

        // If the take profit level's gain drawdown% limit has been exceeded, close the position
        else if (gs.gain_drawdown <= this.calculateMaxGainDrawdown(gs.gain)) {
            await this.closePosition(pos.symbol);
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
        else if (gain >= this.strategy.take_profit_3.price_change_requirement) {
            return this.strategy.take_profit_3.max_gain_drawdown;
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
     * @param symbol 
     * @returns Promise<void>
     */
    private onPositionCloseFactory(symbol: string): () => Promise<void> {
        return () => this.onPositionClose(symbol);
    }
    private async onPositionClose(symbol: string): Promise<void> {
        // Firstly, set the close time on the record
        this.active[symbol].close = Date.now();

        // Add the active candlestick to the history
        this.active[symbol].history.push(this.buildCandlestickRecord(this.activeCandlestick[symbol]));

        // Store the position the db
        await this._model.savePosition(this.active[symbol]);

        // Notify the users
        this._notification.positionHasBeenClosed(this.active[symbol]);

        // Finally, clean the position from the local properties
        delete this.active[symbol];
        delete this.activeCandlestick[symbol];
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
     * @returns IPositionHeadline[]
     */
    public getActivePositionHeadlines(): IPositionHeadline[] {
        return Object.values(this.active).map((position: IPositionRecord) => {
            return {
                id: position.id, 
                o: position.open,
                s: position.coin.symbol, 
                sd: position.side,
                g: position.gain,
                gd: position.gain_drawdown,
                slo: position.stop_loss_order && typeof position.stop_loss_order == "object" ? true: false
            };
        });
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
        let record: IPositionRecord|undefined = Object.values(this.active).filter((p) => p.id == id)[0];

        // If the position is active, add the current candlestick to the history
        if (record) {
            // Clone the record prior to adding the candlestick
            let localRecord: IPositionRecord = JSON.parse(JSON.stringify(record));
            localRecord.history.push(this.buildCandlestickRecord(this.activeCandlestick[record.coin.symbol]));
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
    private openPositionFactory(side: IBinancePositionSide, symbol: string): () => Promise<void> {
        return () => this.openPosition(side, symbol);
    }
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
            side == "LONG" ? "BUY": "SELL",
            amount
        );

        // Store the payload if provided
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload("POSITION_OPEN", symbol, side, payload);
        }
    }








    /**
     * Closes an active position based on the given symbol.
     * @param symbol 
     * @returns Promise<void>
     */
    public async closePosition(symbol: string): Promise<void> {
        // Firstly, make sure there is an active position for the given symbol
        if (!this.active[symbol]) {
            throw new Error(this._utils.buildApiError(`The position cannot be closed because ${symbol} does not have an active one.`, 29003));
        }

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload|undefined = await this._binance.order(
            symbol,
            this.active[symbol].side == "LONG" ? "SELL": "BUY",
            Math.abs(this.active[symbol].position_amount)
        );

        // Do something with the payload if provided @TODO
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload("POSITION_CLOSE", symbol, this.active[symbol].side, payload);
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
        try { return await this._binance.order(symbol, actionSide, quantity, stopPrice) }
        catch (e) {
            console.log(`1/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
            await this._utils.asyncDelay(3);
            try { return await this._binance.order(symbol, actionSide, quantity, stopPrice) }
            catch (e) {
                console.log(`2/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
                await this._utils.asyncDelay(5);
                try { return await this._binance.order(symbol, actionSide, quantity, stopPrice) }
                catch (e) {
                    console.log(`3/3 ) Error when creating STOP_MARKET order for ${symbol}: `, e);
                    await this._utils.asyncDelay(7);
                    return await this._binance.order(symbol, actionSide, quantity, stopPrice);
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
            leverage: 70,
            position_size: 1,
            positions_limit: 1,
            take_profit_1: { price_change_requirement: 0.35, activation_offset: 0.1, max_gain_drawdown: -100 },
            take_profit_2: { price_change_requirement: 0.55, activation_offset: 0.1, max_gain_drawdown: -35 },
            take_profit_3: { price_change_requirement: 0.9,  activation_offset: 0.1, max_gain_drawdown: -15 },
            stop_loss: 0.15
        }
    }









    













    /***************************
     * Futures Account Balance *
     ***************************/





    /**
     * Retrieves the current futures account balance and
     * updates the local property.
     * @returns Promise<void>
     */
    public async refreshBalance(): Promise<void> {
        // Retrieve the account balances
        let balances: IBinanceBalance[] = await this._binance.getBalances();

        // Filter all the balances except for USDT
        balances = balances.filter((b) => b.asset == "USDT");
        if (balances.length != 1) {
            console.log(balances);
            throw new Error(this._utils.buildApiError(`The USDT balance could not be retrieved from the Binance API. Received ${balances.length}`, 29001));
        }

        // Ensure all the required properties have been extracted
        if (typeof balances[0].availableBalance != "string" || typeof balances[0].balance != "string") {
            throw new Error(this._utils.buildApiError(`The extracted USDT balance object is not complete. 
            Available ${balances[0].availableBalance} | Balance: ${balances[0].balance}`, 29002));
        }

        // Calculate the balance
        const available: BigNumber = new BigNumber(balances[0].availableBalance);
        const total: BigNumber = new BigNumber(balances[0].balance);

        // Update the local property
        this.balance = {
            available: <number>this._utils.outputNumber(available),
            on_positions: <number>this._utils.outputNumber(total.minus(available)),
            total: <number>this._utils.outputNumber(total),
            ts: balances[0].updateTime || Date.now()
        };
    }




    /**
     * Builds the default Binance Balance object and sets it on the local property.
     * @returns Promise<IBinanceBalance[]>
     */
    private setDefaultBalance(): void {
        this.balance = { available: 0, on_positions: 0, total: 0, ts: Date.now() };
    }
}
