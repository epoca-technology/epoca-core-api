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
    IPositionUtilities,
    IPositionStrategy,
    IPositionValidations,
    IPositionInteractions,
    IActivePositions,
    IActivePositionHeadlines
} from "./interfaces";
import { ICandlestickService } from "../candlestick";




@injectable()
export class PositionUtilities implements IPositionUtilities {
    // Inject dependencies
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.CoinsService)               private _coin: ICoinsService;
    @inject(SYMBOLS.NotificationService)        private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;





    /**
     * Position Strategy
     * A local copy of the strategy in order to simplify the processes.
     */
    private strategy: IPositionStrategy;






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
        let gain_drawdown: number = 0;

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
        return { gain: gain, highest_gain: highest_gain, gain_drawdown: gain_drawdown }
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
    private calculatePositionExitStrategy(
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
            ),
            stop_loss_price: <number>this._utils.alterNumberByPercentage(
                entryPrice, 
                side == "LONG" ? -(this.strategy.stop_loss): this.strategy.stop_loss,
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
    public buildNewActiveCandlestick(
        openTime: number, 
        markPrice: number, 
        gain: number, 
        gainDrawdown: number,
        intervalSeconds: number
    ): IActivePositionCandlestick {
        return {
            ot: openTime,
            ct: moment(openTime).add(intervalSeconds, "seconds").valueOf() - 1,
            markPrice: { o: markPrice, h: markPrice, l: markPrice, c: markPrice},
            gain: { o: gain, h: gain, l: gain, c: gain},
            gainDrawdown: { o: gainDrawdown, h: gainDrawdown, l: gainDrawdown, c: gainDrawdown},
        }
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
    public async openPosition(
        side: IBinancePositionSide, 
        symbol: string,
        positionSize: number,
        leverage: number
    ): Promise<void> {
        // Firstly, retrieve the coin and the price
        const { coin, price } = this._coin.getInstalledCoinAndPrice(symbol);

        // Calculate the notional size
        const notional: BigNumber = new BigNumber(positionSize).times(leverage);

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











    /**
     * Attempts to create a STOP_MARKET order for a given symbol. Once it 
     * completes, it returns the execution payload if returned by Binance.
     * @param symbol 
     * @param side 
     * @param quantity 
     * @param stopPrice 
     * @returns Promise<IBinanceTradeExecutionPayload|undefined>
     */
    public async createStopMarketOrder(
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
                g: long.gain,
                gd: long.gain_drawdown,
                slo: long.stop_loss_order && typeof long.stop_loss_order == "object" ? true: false
            }: null,
            SHORT: short ? {
                id: short.id, 
                o: short.open,
                s: short.coin.symbol, 
                sd: short.side,
                g: short.gain,
                gd: short.gain_drawdown,
                slo: short.stop_loss_order && typeof short.stop_loss_order == "object" ? true: false
            }: null,
        };
    }














    /****************************
     * Trading Strategy Helpers *
     ****************************/




    /**
     * Sets the strategy on the local property. This function must
     * be invoked when the position module initializes and when
     * the strategy is updated.
     * @param newStrategy 
     */
    public strategyChanged(newStrategy: IPositionStrategy): void { this.strategy = newStrategy }






    /**
     * Builds the default strategy object in case it hasn't 
     * yet been initialized.
     * @returns IPositionStrategy
     */
    public buildDefaultStrategy(): IPositionStrategy {
        return {
            long_status: false,
            short_status: false,
            bitcoin_only: true,
            leverage: 100,
            position_size: 5,
            take_profit_1: { price_change_requirement: 0.30, activation_offset: 0.15,   max_gain_drawdown: -100, reduction_size_on_contact: 0 },
            take_profit_2: { price_change_requirement: 0.55, activation_offset: 0.125,  max_gain_drawdown: -100, reduction_size_on_contact: 0 },
            take_profit_3: { price_change_requirement: 0.75, activation_offset: 0.10,   max_gain_drawdown: -100, reduction_size_on_contact: 0.15 },
            take_profit_4: { price_change_requirement: 0.90, activation_offset: 0.075,  max_gain_drawdown: -15,  reduction_size_on_contact: 0.20 },
            take_profit_5: { price_change_requirement: 1.25, activation_offset: 0.05,   max_gain_drawdown: -5,   reduction_size_on_contact: 0.25 },
            stop_loss: 0.275,
            reopen_if_better_duration_minutes: 180,
            reopen_if_better_price_adjustment: 0.35,
            low_volatility_coins: [
                "BTCUSDT", "BNBUSDT", "ADAUSDT", "BCHUSDT", "ETHUSDT", "XRPUSDT", "TRXUSDT", "SOLUSDT"
            ]
        }
    }
}
