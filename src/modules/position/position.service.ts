import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import * as moment from "moment";
import { Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IEpochService } from "../epoch";
import { 
    IBinanceActivePosition, 
    IBinanceBalance, 
    IBinancePositionSide, 
    IBinanceService, 
    IBinanceTradeExecutionPayload,
    IBinanceTradePayload
} from "../binance";
import { IOrderBook, IOrderBookService } from "../order-book";
import { IPredictionResult } from "../epoch-builder";
import { ICandlestickService, ICandlestickStream } from "../candlestick";
import { ISignalService } from "../signal";
import { IApiErrorService } from "../api-error";
import { INumber, IUtilitiesService } from "../utilities";
import { 
    IAccountBalance,
    IActivePosition,
    IPositionHealth,
    IPositionModel,
    IPositionNotifications,
    IPositionService,
    IPositionStrategy,
    IPositionSummary,
    IPositionTrade,
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.EpochService)               private _epoch: IEpochService;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.SignalService)              private _signal: ISignalService;
    @inject(SYMBOLS.OrderBookService)           private _orderBook: IOrderBookService;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionHealth)             private _health: IPositionHealth;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.PositionNotifications)      private _notification: IPositionNotifications;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;


    /**
     * Account Balance
     * The balance of the futures account.
     */
    private balance: IAccountBalance;



    /**
     * Strategy
     * The strategy that will folowed in order to operate.
     */
    private strategy: IPositionStrategy;



    /**
     * Long Position
     * The active long position, if none is, this value is undefined.
     */
    private long: IActivePosition|undefined;



    /**
     * Short Position
     * The active short position, if none is, this value is undefined.
     */
    private short: IActivePosition|undefined;


    /**
     * Candlesticks Stream
     * Stream of new candlesticks for the watcher to evaluate active positions.
     */
    private candlesticksSub: Subscription;


    /**
     * Signal
     * Stream of signals for the strategy to open positions accordingly.
     */
    private signalSub: Subscription;



    /**
     * Balance Syncing
     */
    private balanceSyncInterval: any;
    private readonly balanceIntervalSeconds: number = 60 * 5; // Every ~5 minutes



    /**
     * Active Positions Syncing
     */
    private activePositionsSyncInterval: any;
    private readonly activePositionsIntervalSeconds: number = 12; // Every ~12 seconds



    /**
     * Position Trades Syncing
     * Binance only allows to query less than 7 days at a time. Therefore, trades
     * should be synced in windows of 5 days. If no data is found within the range,
     * should move to the next window.
     */
    private tradesSyncInterval: any;
    private readonly tradesIntervalSeconds: number = 60 * 15; // Every ~15 minutes
    private tradesSyncCheckpoint: number|undefined = undefined;



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

        // Initialize the health
        await this._health.initialize();

        // Initialize the data
        await this.refreshData(false, 4);

        // Subscribe to the candlesticks module
        this.candlesticksSub = this._candlestick.stream.subscribe(async (stream: ICandlestickStream) => {
            try {
                await this.onNewCandlesticks(stream);
            } catch (e) {
                console.log(e);
                this._apiError.log("PositionService.initialize.candlesticksSub", e);
                this._notification.onNewCandlesticksError(e);
            }
        });

        // Subscribe to the signals module
        this.signalSub = this._signal.active.subscribe(async (pred: IPredictionResult) => {
            if (pred != 0) {
                try {
                    await this.onNewSignal(pred);
                } catch (e) {
                    console.log(e);
                    this._apiError.log("PositionService.initialize.signalSub", e);
                    this._notification.onNewSignalError(e);
                }
            }
        });

        // Initialize the intervals
        this.balanceSyncInterval = setInterval(async () => {
            try { await this.refreshBalance() } catch (e) { 
                this._apiError.log("PositionService.interval.refreshBalance", e);
            }
        }, this.balanceIntervalSeconds * 1000);
        this.activePositionsSyncInterval = setInterval(async () => {
            try { await this.refreshActivePositions() } catch (e) { 
                this._apiError.log("PositionService.interval.refreshActivePositions", e);
            }
        }, this.activePositionsIntervalSeconds * 1000);
        this.tradesSyncInterval = setInterval(async () => {
            try { await this.updateTrades() } catch (e) { 
                console.error(e);
                this._apiError.log("PositionService.interval.updateTrades", e);
            }
        }, this.tradesIntervalSeconds * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.candlesticksSub) this.candlesticksSub.unsubscribe();
        if (this.signalSub) this.signalSub.unsubscribe();
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
        if (this.tradesSyncInterval) clearInterval(this.tradesSyncInterval);
        this.tradesSyncInterval = undefined;
    }

















    /**************
     * Retrievers *
     **************/





    /**
     * Retrieves the latest position summary without forcing
     * a refresh.
     * @returns IPositionSummary
     */
    public getSummary(): IPositionSummary {
        return {
            balance: this.balance,
            strategy: this.strategy,
            long: this.long,
            short: this.short,
            health: {
                long: this._health.long,
                short: this._health.short
            }
        }
    }












    /* Balance */



    /**
     * Retrieves the current futures account balance and
     * updates the local property.
     * @returns Promise<void>
     */
    private async refreshBalance(): Promise<void> {
        // Retrieve the account balances
        let balances: IBinanceBalance[] = await this.getBinanceBalances();

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
     * Retrieves the Binance Balances in a persistant manner.
     * @returns Promise<IBinanceBalance[]>
     */
    private async getBinanceBalances(): Promise<IBinanceBalance[]> {
        try { return await this._binance.getBalances() } catch (e) {
            console.error(`1) Failed to retrieve the Binance Balance. Attempting again in a few seconds...`, e);
            await this._utils.asyncDelay(3);
            try { return await this._binance.getBalances() } catch (e) {
                console.error(`2) Failed to retrieve the Binance Balance. Attempting again in a few seconds...`, e);
                await this._utils.asyncDelay(5);
                return await this._binance.getBalances()
            }
        }
    }





    /* Active Positions */


    /**
     * Retrieves the active positions, updates the local property
     * and checks if an event needs to broadcasted through the
     * notifications module.
     * @returns Promise<void>
     */
    private async refreshActivePositions(): Promise<void> {
        // Retrieve the binance active positions
        const binancePositions: [IBinanceActivePosition, IBinanceActivePosition] = await this.getBinanceActivePositions();

        // Initialize the raw active positions
        let rawLong: IBinanceActivePosition|undefined = undefined;
        let rawShort: IBinanceActivePosition|undefined = undefined;
        binancePositions.forEach((p: IBinanceActivePosition) => {
            if (Number(p.entryPrice) > 0) {
                if (p.positionSide == "LONG") { rawLong = p }
                else                          { rawShort = p }
            }
        });

        // Update the local properties
        this.long = this.processActivePosition(rawLong);
        this.short = this.processActivePosition(rawShort);

        // Calculate the position health by side
        await this._health.onPositionRefresh(this.long, this.short);

        // Verify if an event should be broadcasted
        await this._notification.onActivePositionRefresh(this.long, this.short);
    }



    /**
     * Converts an active Binance Position into an Epoca Active Position.
     * If there isn't an active Binance position it returns undefined.
     * @param binancePosition 
     * @returns IActivePosition|undefined
     */
    private processActivePosition(binancePosition: IBinanceActivePosition|undefined): IActivePosition|undefined {
        // Only process a position if it exists
        if (binancePosition) {
            // Init values
            const entryPrice: BigNumber = new BigNumber(binancePosition.entryPrice);
            const markPrice: BigNumber = new BigNumber(binancePosition.markPrice);
            const isolatedWallet: number = <number>this._utils.outputNumber(binancePosition.isolatedWallet);

            // Calculate the position exit combination
            const { take_profit_price, stop_loss_price } = this.calculatePositionExitCombination(
                binancePosition.positionSide,
                entryPrice,
                this.strategy.take_profit,
                this.strategy.stop_loss
            );

            // Calculate the current ROE if the entry price is different to the mark price
            let roe: number = 0;
            if (!entryPrice.isEqualTo(markPrice)) {
                // Calculate the price change between the entry and the mark
                const priceChange: BigNumber = <BigNumber>this._utils.calculatePercentageChange(entryPrice, markPrice, {of: "bn"});

                // Calculate the ROE based on a long position
                if (binancePosition.positionSide == "LONG") {
                    roe = <number>this._utils.outputNumber(priceChange.times(this.strategy.leverage));
                } else {
                    roe = <number>this._utils.outputNumber(priceChange.times(this.strategy.leverage).times(-1));
                }
            }

            // Finally, return the position
            return {
                side: binancePosition.positionSide,
                entry_price: <number>this._utils.outputNumber(entryPrice),
                mark_price: <number>this._utils.outputNumber(markPrice),
                take_profit_price: take_profit_price,
                stop_loss_price: stop_loss_price,
                liquidation_price: <number>this._utils.outputNumber(binancePosition.liquidationPrice),
                unrealized_pnl: <number>this._utils.outputNumber(binancePosition.unRealizedProfit),
                roe: roe,
                isolated_wallet: isolatedWallet,
                isolated_margin: <number>this._utils.outputNumber(binancePosition.isolatedMargin),
                position_amount: <number>this._utils.outputNumber(binancePosition.positionAmt, {dp: 8}),
                notional: <number>this._utils.outputNumber(binancePosition.notional),
                ts: binancePosition.updateTime || Date.now()
            }
        } 

        // Otherwise, there isn't an active position on the given side
        else { return undefined }
    }





    /**
     * Calculates the take profit and stop loss prices.
     * @param side 
     * @param entryPrice 
     * @param take_profit 
     * @param stop_loss 
     * @returns { take_profit_price: number, stop_loss_price: number }
     */
    private calculatePositionExitCombination(
        side: IBinancePositionSide, 
        entryPrice: INumber,
        take_profit: number,
        stop_loss: number
    ): { take_profit_price: number, stop_loss_price: number } {
        return {
            take_profit_price: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? take_profit: -(take_profit)
            ),
            stop_loss_price: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? -(stop_loss): stop_loss
            )
        }
    }






    /**
     * Retrieves the active binance positions in a persistant manner.
     * @returns Promise<[IBinanceActivePosition, IBinanceActivePosition]>
     */
    private async getBinanceActivePositions(): Promise<[IBinanceActivePosition, IBinanceActivePosition]> {
        try { return await this._binance.getActivePositions() } catch (e) {
            console.error(`1) Failed to retrieve the Binance Active Positions. Attempting again in a few seconds...`, e);
            await this._utils.asyncDelay(3);
            try { return await this._binance.getActivePositions() } catch (e) {
                console.error(`2) Failed to retrieve the Binance Active Positions. Attempting again in a few seconds...`, e);
                await this._utils.asyncDelay(5);
                return await this._binance.getActivePositions()
            }
        }
    }








    /**
     * Refreshes the balance and the active positions based
     * on the provided configuration. If safe is enabled, 
     * the function will never throw an error. Moreover, if 
     * delaySeconds is provided, a small delay will be applied
     * to the loading of the data.
     * @param safe
     * @param delaySeconds?
     * Promise<void>
     */
     private async refreshData(safe: boolean, delaySeconds?: number): Promise<void> {
        // Refresh the balance
        if (typeof delaySeconds == "number") await this._utils.asyncDelay(delaySeconds);
        try {
            await this.refreshBalance();
        } catch(e) {
            this._apiError.log("PositionService.refreshData.refreshBalance", e);
            if (!safe) throw e;
        }

        // Refresh the active positions
        if (typeof delaySeconds == "number") await this._utils.asyncDelay(delaySeconds);
        try {
            await this.refreshActivePositions();
        } catch(e) {
            this._apiError.log("PositionService.refreshData.refreshActivePositions", e);
            if (!safe) throw e;
        }
    }















    /*********************
     * Signal Management *
     *********************/





    /**
     * When a non-neutral signal is generated, it verifies
     * if a new position can be opened. The requirements are:
     * - Non-neutral prediction
     * - Non-existant position side
     * - Enabled position side
     * - Not Idling
     * @param pred 
     * @returns Promise<void>
     */
    private async onNewSignal(pred: IPredictionResult): Promise<void> {
        // Init the current time
        const ts: number = Date.now();

        // Check if a long position can be opened
        if (
            pred == 1 &&
            !this.long &&
            this.strategy.long_status &&
            ts >= this.strategy.long_idle_until
        ) { await this.openPosition("LONG") }

        // Check if a short position can be opened
        else if (
            pred == -1 &&
            !this.short &&
            this.strategy.short_status &&
            ts >= this.strategy.short_idle_until
        ) { await this.openPosition("SHORT") }
    }

















    /********************
     * Position Watcher *
     ********************/





    /**
     * Whenever new candlesticks are processed, active positions
     * are evaluated and closed if the criteria is met.
     * @param stream 
     * @returns Promise<void>
     */
    private async onNewCandlesticks(stream: ICandlestickStream): Promise<void> {
        // Ensure there is an active position before proceeding
        if (this.long || this.short) {
            // Firstly, ensure the stream is synced
            if (!this._candlestick.isStreamInSync(stream)) {
                throw new Error(this._utils.buildApiError(`The positions cannot be evaluated against the current price
                because the candlesticks stream is out of sync.`, 29003));
            }

            // Init the current price
            const spotPrice: number = stream.candlesticks.at(-1).c;

            // Init the error list
            let errors: string[] = [];

            // Evaluate if the long position should be closed (if any)
            if (this.long) {
                try {
                    await this.evaluateActiveLong(spotPrice);
                } catch(e) {
                    console.log("Error when evaluating active long: ", e);
                    errors.push(this._utils.getErrorMessage(e));
                }
            }

            // Evaluate if the short position should be closed (if any)
            if (this.short) {
                try {
                    await this.evaluateActiveShort(spotPrice);
                } catch(e) {
                    console.log("Error when evaluating active short: ", e);
                    errors.push(this._utils.getErrorMessage(e));
                }
            }

            // Finally, rethrow the errors if any
            if (errors.length > 0) throw new Error(errors.join(", "));
        }
    }





    /**
     * Evaluates an active long position. If conditions are met
     * it is closed.
     * @param spotPrice 
     * @returns Promise<void>
     */
    private async evaluateActiveLong(spotPrice: number): Promise<void> {
        if (
            (spotPrice >= this.long.take_profit_price || spotPrice <= this.long.stop_loss_price)
        ) {
            await this.closePosition("LONG", 1);
        }
    }





    /**
     * Evaluates an active short position. If conditions are met
     * it is closed.
     * @param spotPrice 
     * @returns Promise<void>
     */
    private async evaluateActiveShort(spotPrice: number): Promise<void> {
        if (
            (spotPrice <= this.short.take_profit_price || spotPrice >= this.short.stop_loss_price)
        ) {
            await this.closePosition("SHORT", 1);
        }
    }















    /********************
     * Position Actions *
     ********************/





    /**
     * Opens a Long or Short position based on the first level.
     * @param side 
     * @returns Promise<void>
     */
    public async openPosition(side: IBinancePositionSide): Promise<void> {
        // Validate the request
        this._validations.canOpenPosition(
            side,
            side == "LONG" ? this.long: this.short,
            this.strategy.position_size,
            this.balance.available
        );

        // Calculate the position amount in BTC
        const positionAmount: number = await this.calculatePositionAmount(side);

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload = await this._binance.order(
            side == "LONG" ? "BUY": "SELL",
            side,
            positionAmount
        );

        // Send the notification
        this._notification.onNewPosition(side, this.strategy.position_size, positionAmount);

        // Trigger the refresh event
        await this.refreshData(true, 2);
    }









    /**
     * Closes a Long or Short position.
     * @param side
     * @param chunkSize
     * @returns Promise<void>
     */
    public async closePosition(side: IBinancePositionSide, chunkSize: number): Promise<void> {
        // Validate the request
        this._validations.canClosePosition(side, side == "LONG" ? this.long: this.short, chunkSize);

        // Calculate the amount that will be closed based on the chunk size
        const amount: BigNumber = 
            new BigNumber(Math.abs(side == "LONG" ? this.long.position_amount: this.short.position_amount))
            .times(chunkSize)

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload = await this._binance.order(
            side == "LONG" ? "SELL": "BUY",
            side,
            <number>this._utils.outputNumber(amount, { dp: 3, ru: false})
        );

        // Activate the idle
        await this.activateIdle(side);

        // Send the notification
        this._notification.onPositionClose(side == "LONG" ? this.long: this.short, chunkSize);

        // Trigger the refresh event
        await this.refreshData(true, 2);

        // Trigger a trades update safely
        try {
            await this.updateTrades();
        } catch (e) {
            console.error(e);
            this._apiError.log("PositionService.closePosition.updateTrades", e);
        }
    }






    /**
     * Based on a side, it will calculate the total the position amount
     * in BTC.
     * @param side 
     * @returns Promise<number>
     */
    private async calculatePositionAmount(side: IBinancePositionSide): Promise<number> {
        // Firstly, retrieve the order book
        const book: IOrderBook = await this._orderBook.getBook();

        /**
         * Price
         * In order to calculate the price that will be used to open the position,
         * the order book is retrieved and the safe rate is selected according
         * to the position side.
         */
        const price: number = side == "LONG" ? book.safe_ask: book.safe_bid;

        // Calculate the notional size
        const notional: BigNumber = new BigNumber(this.strategy.position_size).times(this.strategy.leverage);

        // Finally, convert the notional to BTC and return the position amount
        return <number>this._utils.outputNumber(notional.dividedBy(price), {dp: 3, ru: false});
    }

    


















    /*********************
     * Position Strategy *
     *********************/




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
        this._validations.canStrategyBeUpdated(this.strategy, newStrategy);

        // Update the timestamp
        newStrategy.ts = Date.now();

        // Update the record
        await this._model.updateStrategy(newStrategy);

        // Update the local strategy
        this.strategy = newStrategy;
    }





    /**
     * The idle is activated for a side when a position
     * is closed.
     * @param side 
     * @returns Promise<void>
     */
    private async activateIdle(side: IBinancePositionSide): Promise<void> {
        // Init the current time
        const currentTS: number = Date.now();

        // Increment the side accordingly
        if (side == "LONG") {
            this.strategy.long_idle_until = moment(currentTS).add(this.strategy.long_idle_minutes, "minutes").valueOf();
        } else {
            this.strategy.short_idle_until = moment(currentTS).add(this.strategy.short_idle_minutes, "minutes").valueOf();
        }
        
        // Update the strategy record
        this.strategy.ts = currentTS;
        await this._model.updateStrategy(this.strategy);
    }






    /**
     * Builds the default strategy object in case it hasn't 
     * yet been initialized.
     * @returns IPositionStrategy
     */
    private getDefaultStrategy(): IPositionStrategy {
        const currentTS: number = Date.now();
        return {
            leverage: 5,
            position_size: 150,
            long_status: false,
            short_status: false,
            long_idle_minutes: 30,
            long_idle_until: currentTS,
            short_idle_minutes: 30,
            short_idle_until: currentTS,
            take_profit: 3,
            stop_loss: 3,
            ts: currentTS
        }
    }

























    /*******************
     * Position Trades *
     *******************/





    /**
     * Retrieves the position trades for a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionTrade[]>
     */
    public async listTrades(startAt: number, endAt: number): Promise<IPositionTrade[]> {
        // Firstly, validate the request
        this._validations.canTradesBeListed(startAt, endAt);

        // Finally, return the trades
        return await this._model.listTrades(startAt, endAt);
    }
    






    /**
     * Whenever this function is invoked it will firstly make 
     * sure there is an active Epoch. Later, will compare the
     * last stored trade (if any) versus the epoch's installation
     * date. Finally, it will retrieve the account trades from
     * the Binance API, process them and store them in the db.
     * @returns Promise<void>
     */
    private async updateTrades(): Promise<void> {
        // Ensure an Epoch is active
        if (this._epoch.active.value) {
            // Initialize the current time
            const ts: number = Date.now();

            /**
             * Initialize the starting point based on the active checkpoint.
             * If there is no checkpoint, compare the last stored trade vs the 
             * epoch's installation. Whichever is greater should be the starting point.
             */
            let startAt: number|undefined = this.tradesSyncCheckpoint;
            if (typeof startAt != "number") {
                const lastTS: number|undefined = await this._model.getLastTradeTimestamp();
                if (typeof lastTS == "number" && lastTS > this._epoch.active.value.installed) {
                    startAt = lastTS + 1; // Increase it by 1ms in order to avoid duplicates
                } else {
                    startAt = this._epoch.active.value.installed;
                }
            }

            /**
             * Initialize the end of the range. If the value is greater than the
             * current time, use that value instead.
             */
            let endAt: number = moment(startAt).add(5, "days").valueOf();
            if (endAt > ts) { endAt = ts }

            // Retrieve the latest trades
            const trades: IBinanceTradePayload[] = await this._binance.getTradeList(startAt, endAt);

            // If there are any new trades, store them
            if (trades.length) {
                // Save the trades
                await this._model.saveTrades(trades.map((t) => this.processBinanceTrade(t)));

                // Unset the checkpoint
                this.tradesSyncCheckpoint = undefined;
            }

            // If the list is empty, save the current end so the syncing can move on
            else if (!trades.length && endAt != ts) { this.tradesSyncCheckpoint = endAt }

            // Otherwise, just unset the checkpoint
            else { this.tradesSyncCheckpoint = undefined }
        }
    }






    /**
     * Given a raw binance trade payload, it will convert it 
     * into a proper trade that will be stored in the db.
     * @param raw 
     * @returns IPositionTrade
     */
    private processBinanceTrade(raw: IBinanceTradePayload): IPositionTrade {
        return {
            id: `${raw.id || 'NA'}_${raw.orderId || 'NA'}`,
            t: raw.time,
            s: raw.side,
            ps: raw.positionSide,
            p: <number>this._utils.outputNumber(raw.price),
            qty: <number>this._utils.outputNumber(raw.qty, {dp: 3}),
            qqty: <number>this._utils.outputNumber(raw.quoteQty),
            rpnl: <number>this._utils.outputNumber(raw.realizedPnl),
            c: <number>this._utils.outputNumber(raw.commission, {ru: true})
        }
    }
}
