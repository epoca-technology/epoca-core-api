import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinanceBalance, 
    IBinancePositionSide, 
    IBinanceService,
    IBinanceTradeExecutionPayload, 
} from "../binance";
import { ISignalRecord, ISignalService } from "../signal";
import { ICoinsService } from "../market-state";
import { INotificationService } from "../notification";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    IAccountBalance,
    IActivePositionCandlestick,
    IPositionActionKind,
    IPositionActionRecord,
    IPositionCandlestickRecord,
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
    @inject(SYMBOLS.CoinsService)              private _coin: ICoinsService;
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
    private readonly candlestickIntervalSeconds: number = 30;




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
                    this._apiError.log("PositionService.signalSub.@TODO", e);
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

        // Only proceed if position slots are available
        if (activeNum < this.strategy.positions_limit) {
            // Calculate the number of positions that can be opened
            const availableSlots: number = this.strategy.positions_limit - activeNum;

            // Handle a Long Signal
            if (
                signal.r == 1 &&
                this.strategy.long_status
            ) {

            }

            // Handle a Short Signal
            else if (
                signal.r == -1 &&
                this.strategy.short_status
            ) {

            }
        }
    }





















    /******************************
     * Active Position Management *
     ******************************/







    /**
     * Retrieves the active position and handles it accordingly.
     * @returns Promise<void>
     */
    private async refreshActivePositions(): Promise<void> {
        // Retrieve the position
        const position: IBinanceActivePosition[] = await this._binance.getActivePositions();

        // ...
        


        // Reset the queued positions
        this.queuedPositions = 0;
    }













    /* Position Candlestick Helpers */








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
                slo: position.stop_loss_order && typeof position.stop_loss_order == "object"
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
            record = Object.assign({}, record);
            record.history.push(this.buildCandlestickRecord(this.activeCandlestick[record.coin.symbol]));
        }

        // If no record was found, retrieve it from the database
        else { record = await this._model.getPositionRecord(id) }

        // Finally, return the record
        return record;
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
            side,
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
            this.active[symbol].side == "LONG" ? "BUY": "SELL",
            this.active[symbol].side,
            this.active[symbol].position_amount
        );

        // Do something with the payload if provided @TODO
        if (payload && typeof payload == "object") {
            await this._model.savePositionActionPayload("POSITION_CLOSE", symbol, this.active[symbol].side, payload);
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
            leverage: 5,
            position_size: 20,
            positions_limit: 3,
            take_profit_1: { price_change_requirement: 0.35,    max_gain_drawdown: -15 },
            take_profit_2: { price_change_requirement: 1,       max_gain_drawdown: -7.5 },
            take_profit_3: { price_change_requirement: 2,       max_gain_drawdown: -5 },
            stop_loss: 0.5
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
