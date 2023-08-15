import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinancePositionSide, 
    IBinanceService,
    IBinanceTradeExecutionPayload, 
} from "../binance";
import { ICoin, ICoinsService } from "../market-state";
import { IUtilitiesService } from "../utilities";
import { 
    IActivePositionCandlestick,
    IPositionCandlestick,
    IPositionCandlestickRecord,
    IPositionExitStrategy,
    IPositionGainState,
    IPositionModel,
    IPositionRecord,
    IPositionUtilities,
    IPositionStrategy,
    IActivePositionHeadlines,
    ITakeProfitLevelID
} from "./interfaces";




@injectable()
export class PositionUtilities implements IPositionUtilities {
    // Inject dependencies
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.CoinsService)               private _coin: ICoinsService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;





    /**
     * Position Strategy
     * A local copy of the strategy in order to simplify the processes.
     */
    private strategy: IPositionStrategy;



    /**
     * Bitcoin Symbol
     * Even though Epoca could manage positions for any symbol, the selected
     * strategy focuses only on Bitcoin.
     */
    public readonly btcSymbol: string = "BTCUSDT";


    /**
     * Maximum Side Notional
     * Sides can be increased for as long as all the requirements are met.
     * However, once the position notional reaches maxSideNotional, it 
     * will not be increased until reductions take place.
     */
    private maxSideNotional: number;




    /**
     * Minimum Reduction Amount
     * Exchanges restrict the minimum amount that can be executed on a 
     * single trade. 
     */
    private readonly minReductionAmount: number = 0.0015;




    

    constructor() {}




















    /*******************************
     * Position Management Helpers *
     *******************************/






    /**
     * Calculates the gain state of a given position.
     * @param side 
     * @param entryPrice 
     * @param markPrice 
     * @param highestGain 
     * @returns IPositionGainState
     */
    public calculateGainState(
        side: IBinancePositionSide, 
        entryPrice: number,
        markPrice: number,
        highestGain: number,
    ): IPositionGainState {
        // Init values
        let gain: number = 0;
        let highest_gain: number = highestGain;

        // Calculate the current gain based on a long position
        if (side == "LONG") {
            gain = <number>this._utils.calculatePercentageChange(entryPrice, markPrice);
        }

        // Calculate the gain based on a short position
        else {
            gain = <number>this._utils.calculatePercentageChange(markPrice, entryPrice);
        }

        // Check if the gain is the highest yet
        highest_gain = gain > highest_gain ? gain: highest_gain;

        // Finally, return the state
        return { gain: gain, highest_gain: highest_gain, active_tp_level: this.getActiveTakeProfitLevelID(gain) }
    }








    /**
     * Retrieves the active take profit level id based on the 
     * current accumulated gain. If no take profit level is 
     * active, it returns undefined.
     * @param gain 
     * @returns ITakeProfitLevelID|undefined
     */
    private getActiveTakeProfitLevelID(gain: number): ITakeProfitLevelID|undefined {
        // Level 1 is active
        if (gain >= this.strategy.take_profit_1.price_change_requirement && gain < this.strategy.take_profit_2.price_change_requirement) {
            return "take_profit_1";
        }

        // Level 2 is active
        else if (gain >= this.strategy.take_profit_2.price_change_requirement && gain < this.strategy.take_profit_3.price_change_requirement) {
            return "take_profit_2";
        }

        // Level 3 is active
        else if (gain >= this.strategy.take_profit_3.price_change_requirement && gain < this.strategy.take_profit_4.price_change_requirement) {
            return "take_profit_3";
        }

        // Level 4 is active
        else if (gain >= this.strategy.take_profit_4.price_change_requirement && gain < this.strategy.take_profit_5.price_change_requirement) {
            return "take_profit_4";
        }

        // Level 5 is active
        else if (gain >= this.strategy.take_profit_5.price_change_requirement) {
            return "take_profit_5";
        }

        // No Level is active
        else { return undefined } 
    } 







    /**
     * Calculates the chunk size of a reduction based on the 
     * take profit level and the remaining capital in the 
     * position.
     * @param currentPrice 
     * @param positionAmountNotional 
     * @param activeLevel 
     * @returns number
     */
    public calculateReductionChunkSize(
        currentPrice: number,
        positionAmountNotional: number, 
        activeLevel: ITakeProfitLevelID
    ): number {
        // Calculate the notional all positions start with
        const originalNotional: BigNumber = 
            new BigNumber(this.strategy.position_size).times(this.strategy.leverage);

        // Calculate the position's remaining amount
        const remaining: number = 
            <number>this._utils.calculatePercentageOutOfTotal(positionAmountNotional, originalNotional);

        // If there is less than 30% of the position remaining, close the whole thing
        if (remaining <= this.strategy.side_min_percentage) { return 1 }

        // Otherwise, calculate the size of the chunk that will be reduced
        else {
            // Calculate the minimum notional that can be traded
            const minNotional: number = <number>this._utils.outputNumber(
                new BigNumber(this.minReductionAmount).times(currentPrice), {ru: true}
            );

            // Calculate the reduction size based on the active tp level
            const rawReductionSize: BigNumber = 
                new BigNumber(positionAmountNotional).times(this.strategy[activeLevel].reduction_size);

            // If the reduction size is greater than the minimum, return it
            if (rawReductionSize.isGreaterThan(minNotional)) {
                return this.strategy[activeLevel].reduction_size;
            }

            // Otherwise, calculate the min chunk size that can be closed
            else {
                // Calculate the % represented by the min reduction size compared to the full size
                const minReductionPercent: BigNumber = 
                    <BigNumber>this._utils.calculatePercentageOutOfTotal(minNotional, positionAmountNotional, {of: "bn", dp: 2, ru: true});
                
                // Convert the min reduction % into a chunk size
                const chunkSize: number = <number>this._utils.outputNumber(minReductionPercent.dividedBy(100), {dp: 2, ru: true});

                // Finally, return it
                return chunkSize;
            }
        }
    }


















    /******************
     * Position Build *
     ******************/



    /**
     * Builds a Position Record for a brand new position.
     * @param pos
     * @returns IPositionRecord
     */
    public buildNewPositionRecord(pos: IBinanceActivePosition): IPositionRecord {
        // Init the time
        const ts: number = Date.now();

        // Retrieve the coin
        const coin: ICoin = this._coin.getInstalledCoin(pos.symbol);

        // Initialize the position amount
        const positionAmount: number = <number>this._utils.outputNumber(pos.positionAmt, { dp: coin.quantityPrecision });

        // Initialize the entry price and put the exit prices strategy together
        const entryPrice: number = <number>this._utils.outputNumber(pos.entryPrice, {dp: coin.pricePrecision});
        const exit: IPositionExitStrategy = this.calculatePositionExitStrategy(
            pos.positionSide, 
            entryPrice, 
            coin.pricePrecision
        );

        // Finally, return the build
        return {
            // General Data
            id: this._utils.generateID(),
            open: ts,
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
                take_profit_1: [],
                take_profit_2: [],
                take_profit_3: [],
                take_profit_4: [],
                take_profit_5: [],
            },

            // Gain Data
            gain: 0,
            highest_gain: 0,

            // Next Increase
            next_increase: moment(ts).add(this.strategy.side_increase_idle_hours, "hours").valueOf(),

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
    public calculatePositionExitStrategy(
        side: IBinancePositionSide, 
        entryPrice: number, 
        pricePrecision: number
    ): IPositionExitStrategy {
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
            )
        }
    }
















    /*********************************
     * Position Candlesticks Helpers *
     *********************************/




    /**
     * Updates a partial candlestick item with the new data
     * @param currentValue 
     * @param item 
     * @returns Partial<IPositionCandlestick>
     */
    public buildUpdatedCandlestickItem(currentValue: number, item: Partial<IPositionCandlestick>): Partial<IPositionCandlestick> {
        return {
            o: item.o,
            h: currentValue > item.h ? currentValue: item.h,
            l: currentValue < item.l ? currentValue: item.l,
            c: currentValue
        }
    }







    /**
     * Builds a packed candlestick record from an active one.
     * @param active 
     * @returns IPositionCandlestickRecord
     */
    public buildCandlestickRecord(active: IActivePositionCandlestick): IPositionCandlestickRecord {
        return {
            ot: active.ot,
            d: {
                o: [ active.markPrice.o, active.gain.o ],
                h: [ active.markPrice.h, active.gain.h ],
                l: [ active.markPrice.l, active.gain.l ],
                c: [ active.markPrice.c, active.gain.c ],
            }
        }
    }






    /**
     * Builds a brand new active candlestick ready to be attached
     * to a symbol.
     * @param openTime 
     * @param markPrice 
     * @param gain 
     * @param intervalMinutes 
     * @returns IActivePositionCandlestick
     */
    public buildNewActiveCandlestick(
        openTime: number, 
        markPrice: number, 
        gain: number, 
        intervalMinutes: number
    ): IActivePositionCandlestick {
        return {
            ot: openTime,
            ct: moment(openTime).add(intervalMinutes, "minutes").valueOf() - 1,
            markPrice: { o: markPrice, h: markPrice, l: markPrice, c: markPrice},
            gain: { o: gain, h: gain, l: gain, c: gain},
        }
    }





















    /********************
     * Position Actions *
     ********************/








    /**
     * Opens a new position for a provided symbol on the given side.
     * @param side 
     * @returns Promise<void>
     */
    public async openPosition(side: IBinancePositionSide): Promise<void> {
        // Firstly, retrieve the coin and the price
        const { coin, price } = this._coin.getInstalledCoinAndPrice(this.btcSymbol);

        // Calculate the notional size
        const notional: BigNumber = new BigNumber(this.strategy.position_size).times(this.strategy.leverage);

        // Convert the notional into the coin, resulting in the leveraged position amount
        const amount: number = <number>this._utils.outputNumber(notional.dividedBy(price), {dp: coin.quantityPrecision, ru: false});

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload|undefined = await this._binance.order(
            this.btcSymbol,
            side,
            side == "LONG" ? "BUY": "SELL",
            amount
        );

        // Store the payload if provided
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload("POSITION_OPEN", this.btcSymbol, side, payload);
        }
    }












    /**
     * Closes an active position based on the given side.
     * @param position 
     * @param chunkSize 
     * @returns Promise<void>
     */
    public async closePosition(position: IPositionRecord, chunkSize?: number): Promise<void> {
        // Firstly, make sure there is an active position for the given side
        if (!position) {
            throw new Error(this._utils.buildApiError(`The position cannot be closed because there isnt an active one.`, 29500));
        }

        // Initialize the chunk size in case it wasn't provided
        chunkSize = typeof chunkSize == "number" ? chunkSize: 1;

        // Calculate the position amount
        const positionAmount: number = <number>this._utils.outputNumber(
            new BigNumber(Math.abs(position.position_amount)).times(chunkSize),
            { dp: position.coin.quantityPrecision, ru: false}
        );

        // Execute the trade
        const payload: IBinanceTradeExecutionPayload|undefined = await this._binance.order(
            position.coin.symbol,
            position.side,
            position.side == "LONG" ? "SELL": "BUY",
            positionAmount
        );

        // Store the position action payload
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload(
                "POSITION_CLOSE", 
                position.coin.symbol, 
                position.side, 
                payload
            );
        }
    }
























    /************************************
     * Active Position Headlines Helper *
     ************************************/





    /**
     * Builds a list with the active position headlines.
     * @param long
     * @param short
     * @returns IActivePositionHeadlines
     */
    public buildActivePositionHeadlines(long: IPositionRecord|null, short: IPositionRecord|null): IActivePositionHeadlines {
        return {
            LONG: long ? {
                id: long.id, 
                o: long.open,
                s: long.coin.symbol, 
                sd: long.side,
                iw: long.isolated_wallet,
                g: long.gain
            }: null,
            SHORT: short ? {
                id: short.id, 
                o: short.open,
                s: short.coin.symbol, 
                sd: short.side,
                iw: short.isolated_wallet,
                g: short.gain
            }: null,
        };
    }


















    /****************************
     * Trading Strategy Helpers *
     ****************************/







    /**
     * Checks if a position can be increased for a given side.
     * @param side 
     * @param entryPrice 
     * @param currentPrice 
     * @param notional 
     * @param nextIncrease 
     * @returns boolean
     */
    public canSideBeIncreased(
        side: IBinancePositionSide, 
        entryPrice: number, 
        currentPrice: number, 
        notional: number,
        nextIncrease: number,
    ): boolean { 
        // Only proceed if the side has not reached its limit and the idle has faded away
        if (Math.abs(notional) < this.maxSideNotional && Date.now() >= nextIncrease) {
            // Check if a LONG can be increased
            if (side == "LONG") {
                // Calculate the price improvement requirement
                const requirement: number = <number>this._utils.alterNumberByPercentage(
                    entryPrice, 
                    -(this.strategy.increase_side_on_price_improvement)
                );

                // The current price must be less than or equals to the requirement
                return currentPrice <= requirement;
            }

            // Otherwise, evaluate a short
            else {
                // Calculate the price improvement requirement
                const requirement: number = <number>this._utils.alterNumberByPercentage(
                    entryPrice, 
                    this.strategy.increase_side_on_price_improvement
                );

                // The current price must be greater than or equals to the requirement
                return currentPrice >= requirement;
            }
        } else { return false }
    }







    /**
     * Sets the strategy on the local property. This function must
     * be invoked when the position module initializes and when
     * the strategy is updated.
     * @param newStrategy 
     */
    public strategyChanged(newStrategy: IPositionStrategy): void { 
        // Update the local copy
        this.strategy = newStrategy;

        // Update the maximum side notional
        this.maxSideNotional = this.calculateMaxSideNotional();
    }






    /**
     * Builds the default strategy object in case it hasn't 
     * yet been initialized.
     * @returns IPositionStrategy
     */
    public buildDefaultStrategy(): IPositionStrategy {
        return {
            long_status: false,
            short_status: false,
            leverage: 5,
            position_size: 100,
            side_increase_limit: 3,
            side_min_percentage: 30,
            increase_side_on_price_improvement: 2,
            side_increase_idle_hours: 72,
            take_profit_1: { price_change_requirement: 0.50, reduction_size: 0.05,   reduction_interval_minutes: 180.0 },
            take_profit_2: { price_change_requirement: 1.00, reduction_size: 0.10,   reduction_interval_minutes: 120.0 },
            take_profit_3: { price_change_requirement: 1.50, reduction_size: 0.175,  reduction_interval_minutes:  60.0 },
            take_profit_4: { price_change_requirement: 2.00, reduction_size: 0.25,   reduction_interval_minutes:  30.0 },
            take_profit_5: { price_change_requirement: 3.00, reduction_size: 0.35,   reduction_interval_minutes:   7.5 }
        }
    }











    /**
     * Calculates the maximum notional a side can have at a time.
     * This value is calculated whenever the position strategy is
     * initialized or updated.
     * @returns number
     */
    public calculateMaxSideNotional(): number {
        const originalNotional: BigNumber = new BigNumber(this.strategy.position_size).times(this.strategy.leverage);
        return <number>this._utils.outputNumber(originalNotional.times(this.strategy.side_increase_limit));
    }
}
