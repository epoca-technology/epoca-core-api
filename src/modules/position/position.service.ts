import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { 
    IBinanceActivePosition, 
    IBinanceBalance, 
    IBinancePositionSide, 
    IBinanceService, 
    IBinanceTradeExecutionPayload
} from "../binance";
import { IOrderBook, IOrderBookService } from "../order-book";
import { IUtilitiesService } from "../utilities";
import { 
    IAccountBalance,
    IActivePosition,
    IPositionModel,
    IPositionNotifications,
    IPositionService,
    IPositionStrategy,
    IPositionStrategyState,
    IPositionSummary,
    IPositionValidations
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.OrderBookService)           private _orderBook: IOrderBookService;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
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
     * Balance Syncing
     */
    private balanceSyncInterval: any;
    private readonly balanceIntervalSeconds: number = 60 * 5; // Every ~5 minutes


    /**
     * Active Positions Syncing
     */
    private activePositionsSyncInterval: any;
    private readonly activePositionsIntervalSeconds: number = 30; // Every ~30 seconds



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

        // Initialize the data
        await this.refreshData(false, 2);

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
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
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
            short: this.short
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

            // Retrieve the state of the position strategy
            const state: IPositionStrategyState = this.getStrategyState(isolatedWallet);

            // Calculate the target price based on the position side
            let targetPrice: number|undefined = 
                state.current.target == 0 ? <number>this._utils.outputNumber(entryPrice): undefined;
            if (!targetPrice) {
                targetPrice = <number>this._utils.alterNumberByPercentage(
                    entryPrice, 
                    binancePosition.positionSide == "LONG" ? state.current.target: -(state.current.target)
                );
            }

            // Calculate the min increase price
            let minIncreasePrice: number|undefined = undefined;
            if (state.next) {
                minIncreasePrice = <number>this._utils.alterNumberByPercentage(
                    entryPrice, 
                    binancePosition.positionSide == "LONG" ? -(this.strategy.level_increase_requirement): this.strategy.level_increase_requirement
                );
            }


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
                target_price: targetPrice,
                liquidation_price: <number>this._utils.outputNumber(binancePosition.liquidationPrice),
                min_increase_price: minIncreasePrice,
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
        if (typeof delaySeconds == "number") await this._utils.asyncDelay(2);
        try {
            await this.refreshBalance();
        } catch(e) {
            this._apiError.log("PositionService.refreshData.refreshBalance", e);
            if (!safe) throw e;
        }

        // Refresh the active positions
        if (typeof delaySeconds == "number") await this._utils.asyncDelay(2);
        try {
            await this.refreshActivePositions();
        } catch(e) {
            this._apiError.log("PositionService.refreshData.refreshActivePositions", e);
            if (!safe) throw e;
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
        // Perform a basic validation
        this._validations.canInteractWithPositions(side);

        // Refresh the data
        await this.refreshData(false, 1);

        // Validate the request
        this._validations.canOpenPosition(
            side,
            side == "LONG" ? this.long: this.short,
            this.strategy.level_1.size,
            this.balance.available
        );

        // Calculate the position amount in BTC
        const positionAmount: number = await this.calculatePositionAmount(side, this.strategy.level_1.size);

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload = await this._binance.order(
            side == "LONG" ? "BUY": "SELL",
            side,
            positionAmount
        );

        // Trigger the refresh event
        await this.refreshData(true, 2);
    }




    /**
     * Increases an active position to the next level.
     * @param side 
     * @returns Promise<void>
     */
    public async increasePosition(side: IBinancePositionSide): Promise<void> {
        // Perform a basic validation
        this._validations.canInteractWithPositions(side);

        // Refresh the data
        await this.refreshData(false, 1);

        // Init the position
        const position: IActivePosition|undefined = side == "LONG" ? this.long: this.short;
        if (!position) {
            throw new Error(this._utils.buildApiError(`The ${side} position cannot be increased because it isnt active.`, 29003));
        }

        // Calculate the margin allocated to the position
        const margin: number = side == "LONG" ? this.long.isolated_wallet: this.short.isolated_wallet;

        // Calculate the current strategy state
        const {current, next} = this.getStrategyState(margin);

        // Validate the request
        this._validations.canIncreasePosition(side, position, next, this.balance.available);

        // Calculate the position amount in BTC
        const positionAmount: number = await this.calculatePositionAmount(side, next.size);

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload = await this._binance.order(
            side == "LONG" ? "BUY": "SELL",
            side,
            positionAmount
        );


        // Trigger the refresh event
        await this.refreshData(true, 2);
    }





    /**
     * Closes a Long or Short position.
     * @param side 
     * @returns Promise<void>
     */
     public async closePosition(side: IBinancePositionSide): Promise<void> {
        // Perform a basic validation
        this._validations.canInteractWithPositions(side);

        // Refresh the active positions
        await this.refreshActivePositions();

        // Validate the request
        this._validations.canClosePosition(side, side == "LONG" ? this.long: this.short);

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload = await this._binance.order(
            side == "LONG" ? "SELL": "BUY",
            side,
            Math.abs(side == "LONG" ? this.long.position_amount: this.short.position_amount)
        );

        // Trigger the refresh event
        await this.refreshData(true, 2);

        // Trigger a trades update
        // ...
    }






    /**
     * Based on a side and the level size, it will calculate the total
     * size of a position to be executed.
     * @param side 
     * @param levelSize 
     * @returns Promise<number>
     */
    private async calculatePositionAmount(side: IBinancePositionSide, levelSize: number): Promise<number> {
        // Firstly, retrieve the order book
        const book: IOrderBook = await this._orderBook.getBook();

        // Initialize the rate that will be used
        const price: number = side == "LONG" ? book.safe_ask: book.safe_bid;

        // Calculate the notional size
        const notional: BigNumber = new BigNumber(levelSize).times(this.strategy.leverage);

        // Convert the notional to BTC and return it
        return <number>this._utils.outputNumber(notional.dividedBy(price), {dp: 3});
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
        this._validations.canStrategyBeUpdated(newStrategy, this.long, this.short);

        // Update the timestamp
        newStrategy.ts = Date.now();

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
            leverage: 2,
            level_increase_requirement: 5,
            level_1: { id: "level_1", size: 150, target: 1.5},
            level_2: { id: "level_2", size: 300, target: 1},
            level_3: { id: "level_3", size: 600, target: 0.5},
            level_4: { id: "level_4", size: 1200, target: 0},
            ts: Date.now()
        }
    }





    /**
     * Calculates the strategy state for a position, returning
     * the current level and the next. This function should 
     * not be invoked if there is no margin in the position.
     * @param margin
     * @returns IPositionStrategyState
     */
    private getStrategyState(margin: number): IPositionStrategyState {
        // Init the accumulated margin list by level
        const margin_acum: number[] = [
            this.strategy.level_1.size,
            this.strategy.level_1.size + this.strategy.level_2.size,
            this.strategy.level_1.size + this.strategy.level_2.size + this.strategy.level_3.size,
            this.strategy.level_1.size + this.strategy.level_2.size + this.strategy.level_3.size + this.strategy.level_4.size,
        ]

        // Level 1 is active
        if (margin > 0 && margin <= margin_acum[0]) {
            return { current: this.strategy.level_1, next: this.strategy.level_2}
        }

        // Level 2 is active
        else if (margin > margin_acum[0] && margin <= margin_acum[1]) {
            return { current: this.strategy.level_2, next: this.strategy.level_3}
        }

        // Level 3 is active
        else if (margin > margin_acum[1] && margin <= margin_acum[2]) {
            return { current: this.strategy.level_3, next: this.strategy.level_4}
        }

        // Level 4 is active
        else if (margin > margin_acum[2]) {
            return { current: this.strategy.level_4, next: undefined}
        }

        // Otherwise, there is something wrong with the margin
        else {
            throw new Error(this._utils.buildApiError(`The strategy state cannot be calculated as the provided position has no margin. Received ${margin}`, 29000));
        }
    }










    /********************
     * Position History *
     ********************/









    /**
     * Retrieves the position history for a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<any>
     */
    public async getHist(startAt: number, endAt: number): Promise<any> {

    }
    
}
