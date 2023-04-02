import {injectable, inject} from "inversify";
import { WebSocket } from "ws";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { 
    IBinanceService, 
    IBinanceExchangeInformation, 
    IBinanceExchangeInformationSymbol, 
    IMarkPriceStreamDataItem, 
    IBinanceCoinTicker
} from "../binance";
import { IDatabaseService } from "../database";
import { INotificationService } from "../notification";
import { IUtilitiesService } from "../utilities";
import { 
    ICoinsService,
    ICoinsState,
    ICoinState,
    ICoinsSummary,
    ICoinsObject,
    ICoin,
    IStateUtilitiesService,
    ISplitStates,
    IStateType,
    ICoinsScores,
    ICoinScore
} from "./interfaces";




@injectable()
export class CoinsService implements ICoinsService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Coins
     * Binance Futures provides a series of coins that can be installed and traded.
     * Additionally, they can be uninstalled at any time.
     */
    private installed: ICoinsObject;
    private supported: ICoinsObject;
    private scores: ICoinsScores;



    /**
     * Supported Coins Interval
     * Every supportedCoinsIntervalSeconds, the supported coins will be refreshed and the
     * ones installed will be validated. If an installed coin is no longer supported,
     * users will be notified.
     */
    private supportedCoinsInterval: any;
    private readonly supportedCoinsIntervalHours: number = 8;





    /**
     * Websocket
     * Every wsIntervalSeconds, the system will make sure the websocket is in sync.
     * Otherwise, it will notify the users and attempt to restart the subscription.
     */
    private wsInterval: any;
    private readonly wsIntervalSeconds: number = 30;
    private wsLastUpdate: number;
    private ws: WebSocket;
    private states: {[symbol: string]: ICoinState} = {};



    /**
     * State
     * Each coin has its own state that includes the history of prices
     * based on the priceWindowSize.
     */
    private readonly requirement: number = 0.1;
    private readonly strongRequirement: number = 0.4;
    private readonly priceIntervalSeconds: number = 30;
    private readonly priceWindowSize: number = 128; // ~64 minutes





    constructor() {}












    /***************
     * Initializer *
     ***************/





    /**
     * Initializes the supported coins as well as the interval
     * that will keep it synced. It also initializes the
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the installed coins
        await this.initializeInstalledCoins();

        // Initialize the supported coins
        await this.updateSupportedCoins();
        this.supportedCoinsInterval = setInterval(async () => {
            try {
                await this.updateSupportedCoins();
            } catch (e) {
                console.log(e);
                this._apiError.log("CoinsService.updateSupportedCoins", e);
            }
        }, this.supportedCoinsIntervalHours * 60 * 60 * 1000);

        // Initialize the websocket status interval
        this.wsInterval = setInterval(async () => {
            try {
                this.checkWebsocketStatus();
            } catch (e) {
                console.log(e);
                this._apiError.log("CoinsService.checkWebsocketStatus", e);
            }
        }, this.wsIntervalSeconds * 1000);

        // Initialize the price websocket subscription
        this.initializeWebsocketSubscription();
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.supportedCoinsInterval) clearInterval(this.supportedCoinsInterval);
        this.supportedCoinsInterval = undefined;
        if (this.wsInterval) clearInterval(this.wsInterval);
        this.wsInterval = undefined;
        this.stopWebsocketSubscription();
    }























    /*******************
     * Coin Management *
     *******************/






    /* General */






    /**
     * Retrieves an installed coin object.
     * @param symbol 
     * @returns ICoin
     */
    public getInstalledCoin(symbol: string): ICoin {
        this.validateSymbol(symbol);
        if (this.installed[symbol]) {
            return this.installed[symbol];
        } else {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} could not be retrieved because it wasnt found among the installed coins.`, 37004));
        }
    }





    /**
     * Retrieves the coin object as well as the price. Note that
     * this function will throw an error if the coin is not 
     * installed or if it does not have a loaded price.
     * @param symbol 
     * @returns {coin: ICoin, price: number}
     */
    public getInstalledCoinAndPrice(symbol: string): {coin: ICoin, price: number} {
        // Firstly, retrieve the installed coin
        const coin: ICoin = this.getInstalledCoin(symbol);

        // Now ensure the coin has prices
        if (!this.states[symbol].w.length) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} does not have a loaded price.`, 37006));
        }

        // Finally, return the packed values
        return { coin: coin, price: this.states[symbol].w.at(-1).y }
    }






    /**
     * Retrieves the coins summary.
     * @returns ICoinsSummary
     */
    public getCoinsSummary(): ICoinsSummary {
        return { installed: this.installed, supported: this.supported, scores: this.scores }
    }

    



    /**
     * Installs a given coin by symbol.
     * @param symbol 
     * @returns ICoinsSummary
     */
    public async installCoin(symbol: string): Promise<ICoinsSummary> {
        // Vallidate the request
        this.validateSymbol(symbol);
        if (this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be installed because it already is.`, 37001));
        }
        if (!this.supported[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be installed because it is not supported.`, 37002));
        }

        // Install the coin
        this.installed[symbol] = this.supported[symbol];
        this.states[symbol] = this.getDefaultFullCoinState();
        await this.updateInstalledCoins(this.installed);

        // Finally, return the summary of the coins
        return this.getCoinsSummary();
    }





    /**
     * Uninstalls a given coin by symbol.
     * @param symbol 
     * @returns ICoinsSummary
     */
    public async uninstallCoin(symbol: string): Promise<ICoinsSummary> {
        // Vallidate the request
        this.validateSymbol(symbol);
        if (!this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be uninstalled because it is not currently installed.`, 37003));
        }

        // Delete the symbol accordingly
        delete this.installed[symbol];
        delete this.states[symbol];
        await this.updateInstalledCoins(this.installed);

        // Finally, return the summary of the coins
        return this.getCoinsSummary();
    }













    /* Coin Installation Management */






    /**
     * Initializes the currently installed coins. If the module has not
     * yet been initialized, it does it.
     */
    private async initializeInstalledCoins(): Promise<void> {
        // Initialize the installed object
        this.installed = await this.getInstalledCoins();
        if (this.installed === undefined) {
            this.installed = {};
            this.createInstalledCoins(this.installed);
        }

        // Initialize the states
        this.states = {};
        for (let coinSymbol in this.installed) {
            this.states[coinSymbol] = this.getDefaultFullCoinState();
        }
    }




    /**
     * Retrieves the currently installed coins. If none has been installed
     * it returns undefined.
     * @returns Promise<ICoinsObject|undefined>
     */
    private async getInstalledCoins(): Promise<ICoinsObject|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.coins} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }






    /**
     * Creates the installed coins row. Only invoke this function
     * when the installed coins db record is undefined.
     * @param coins 
     * @returns Promise<void>
     */
    private async createInstalledCoins(coins: ICoinsObject): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.coins}(id, data) VALUES(1, $1)`,
            values: [coins]
        });
    }




    /**
     * Updates the currently installed coins.
     * @param coins 
     * @returns Promise<void>
     */
    private async updateInstalledCoins(coins: ICoinsObject): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.coins} SET data=$1 WHERE id=1`,
            values: [coins]
        });
    }












    /* Supported Coins Management */





    /**
     * Retrieves Binance Futures' Exchange Information and 
     * extracts all supported coins. Finally, checks the 
     * installed coins to ensure they are all still supported.
     * @returns Promise<void>
     */
    private async updateSupportedCoins(): Promise<void> {
        // Firstly, retrieve the up-to-date exchange info object
        const info: IBinanceExchangeInformation = await this.getExchangeInfo();

        /**
         * Iterate over each supported symbol and add it to the local property 
         * if complies with all requirements.
         */
        this.supported = {};
        for (let coin of info.symbols) {
            if (this.isCoinSupported(coin)) {
                this.supported[coin.symbol] = {
                    symbol: coin.symbol,
                    pricePrecision: coin.pricePrecision,
                    quantityPrecision: coin.quantityPrecision,
                }
            }
        }

        /**
         * Iterate over each installed coin and ensure it is still supported.
         * If an installed coin is no longer supported, notify the users.
         */
        for (let installedSymbol in this.installed) {
            if (!this.supported[installedSymbol]) {
                await this._notification.coinNoLongerSupported(installedSymbol);
            }
        }

        // Finally, calculate the scores for all coins after a small delay
        await this._utils.asyncDelay(5);
        await this.calculateCoinsScores();
    }





    /**
     * Checks if a coin complies with all the requirements in order to
     * be traded.
     * @param coin 
     * @returns boolean
     */
    private isCoinSupported(coin: IBinanceExchangeInformationSymbol): boolean {
        return coin && 
            typeof coin == "object" && 
            coin.contractType == "PERPETUAL" && 
            coin.status == "TRADING" &&
            coin.quoteAsset == "USDT" &&
            coin.marginAsset == "USDT" &&
            coin.underlyingType == "COIN" &&
            typeof coin.pricePrecision == "number" && 
            typeof coin.quantityPrecision == "number"
    }






    /**
     * Retrieves Binance's information in a persistant way.
     * @returns Promise<IBinanceExchangeInformation>
     */
    private async getExchangeInfo(): Promise<IBinanceExchangeInformation> {
        try { return await this._binance.getExchangeInformation() }
        catch (e) {
            console.log(e);
            await this._utils.asyncDelay(5);
            try { return await this._binance.getExchangeInformation() }
            catch (e) {
                console.log(e);
                await this._utils.asyncDelay(7);
                return await this._binance.getExchangeInformation()
            }
        }
    }








    /**
     * Triggers whenever the system updates the supported coins. 
     * Retrieves the tickers from Binance, analyzes each coin and
     * builds the score object. If a coin no longer meets the 
     * standards, a notification is broadcasted.
     * @returns Promise<void>
     */
    private async calculateCoinsScores(): Promise<void> {
        try {
            // Reset the scores object
            this.scores = {};

            // Firstly, retrieve all the tickers
            const tickers: IBinanceCoinTicker[] = await this._binance.getCoinTickers();

            // Init the list of supported tickers
            let supported: {symbol: string, vol: number}[] = [];
            let volAccum: number = 0;
            for (let ticker of tickers) {
                // Ensure the ticker is marked as supported
                if (this.supported[ticker.symbol]) {
                    // Init the volume value and add it to the list
                    const vol: number = Number(ticker.quoteVolume);
                    supported.push({symbol: ticker.symbol, vol: vol});

                    // Add the volume to the accumulator
                    volAccum += vol;
                }
            }

            // Proceed if supported symbols have been found
            if (supported.length) {
                // Calculate the mean of all the volumes, as well as the requirements
                const mean: number = <number>this._utils.outputNumber(volAccum / supported.length);
                const low: number = <number>this._utils.outputNumber(mean / 10);
                const medium: number = <number>this._utils.outputNumber(mean / 7);
                const high: number = <number>this._utils.outputNumber(mean / 4);

                // Iterate over each supported ticker once again
                for (let ticker of supported) {
                    // Calculate the score
                    const score: ICoinScore = this.calculateCoinScore(ticker.vol, low, medium, high, mean);

                    // Set the score on the object
                    this.scores[ticker.symbol] = score;

                    // If the symbol is installed and the score is not good, notify users
                    if (this.installed[ticker.symbol] && score <= 2) {
                        await this._notification.installedLowScoreCoin(ticker.symbol);
                    }
                }
            }
        } catch (e) {
            console.log(e);
            this._apiError.log("CoinsService.calculateCoinsScores", e);
        }
    }






    /**
     * Calculates the score of a coin based on its 24h volume and the requirements.
     * @param coinVolume 
     * @param low 
     * @param medium 
     * @param high 
     * @param mean 
     * @returns ICoinScore
     */
    private calculateCoinScore(coinVolume: number, low: number, medium: number, high: number, mean: number): ICoinScore {
        if      (coinVolume >= mean)    { return 5 }
        else if (coinVolume >= high)    { return 4 }
        else if (coinVolume >= medium)  { return 3 }
        else if (coinVolume >= low)     { return 2 }
        else                            { return 1 }
    }











    /* Misc Helpers */






    /**
     * Validates a given symbol. If it is invalid, it throws
     * an error.
     * @param symbol 
     */
    private validateSymbol(symbol: string): void {
        if (typeof symbol !== "string" || symbol.length < 5 || symbol.slice(-4) != "USDT") {
            throw new Error(this._utils.buildApiError(`The provided symbol ${symbol} is invalid.`, 37000));
        }
    }




















    






    /**********************
     * State Calculations *
     **********************/






    /**
     * Calculates the up-to-date state for all the coins and
     * returns the minified version.
     * @returns ICoinsState
     */
    public calculateState(): ICoinsState {
        // Firstly, calculate the full state for all symbols
        let minState: ICoinsState = {};
        for (let symbol in this.installed) { 
            this.calculateCoinState(symbol);
            minState[symbol] = { s: this.states[symbol].s, se: this.states[symbol].se, set: this.states[symbol].set }
        }

        // Finally, return the minified build
        return minState;
    }





    /**
     * Calculates the state for a given coin. It is important to 
     * note that a coin needs a minimum of 30 price items in 
     * order to have a state.
     * @param symbol 
     */
    private calculateCoinState(symbol: string): void {
        /**
         * If the state has been set and there are enough items in the window, 
         * calculate the state.
         */
        if (this.states[symbol] && this.states[symbol].w.length == this.priceWindowSize) {
            // Calculate the state
            const { averageState, splitStates } = 
                this._stateUtils.calculateCurrentState(this.states[symbol].w, this.requirement, this.strongRequirement);

            /**
             * State Event
             * This event has the power to open positions. Therefore, if there is one, 
             * the integrity must be verified by validating the last price update.
             * If the coin's price window is not perfectly synced, the state is replaced
             * with 0.
             */
            let stateEvent: IStateType = this.calculateStateEvent(splitStates);
            let stateEventTime: number|null = this.states[symbol].set;
            if (stateEvent != 0) {
                // Make sure the price is properly synced
                if (this.states[symbol].w.at(-1).x <= moment().subtract(this.priceIntervalSeconds + 10, "seconds").valueOf()) {
                    stateEvent = 0;
                }

                // If there is still an event and it is fresh, set the time
                if (stateEvent != 0 && stateEvent != this.states[symbol].se) stateEventTime = Date.now();
            }

            // Update the coin's state
            this.states[symbol].s = averageState;
            this.states[symbol].ss = splitStates;
            this.states[symbol].se = stateEvent;
            this.states[symbol].set = stateEvent != 0 ? stateEventTime: null;
        }

        // If the state is not in the object, initialize it
        else if (!this.states[symbol]) {
            this.states[symbol] = this.getDefaultFullCoinState();
        }
    }






    /**
     * Calculates the state event for a coin based on its split states.
     * @param splitStates 
     * @returns IStateType
     */
    private calculateStateEvent(splitStates: ISplitStates): IStateType {
        // Init the state
        let stateEvent: IStateType = 0;

        /* Support Reversal */

        // Check if a strong support reversal took place
        if (
            splitStates.s100.s <= -2 &&
            splitStates.s75.s <= -2 &&
            splitStates.s50.s <= -2 &&
            splitStates.s25.s <= -2 &&
            splitStates.s15.s <= -2 &&
            splitStates.s10.s <= -2 &&
            splitStates.s5.s >= 0 &&
            splitStates.s2.s >= 1
        ) { stateEvent = -2 }

        // Check if a support reversal took place
        else if (
            splitStates.s100.s <= -1 &&
            splitStates.s75.s <= -1 &&
            splitStates.s50.s <= -1 &&
            splitStates.s25.s <= -1 &&
            splitStates.s15.s <= -1 &&
            splitStates.s10.s <= -1 &&
            splitStates.s5.s >= 0 &&
            splitStates.s2.s >= 1
        ) { stateEvent = -1 }

        /* Resistance Reversal */

        // Check if a strong resistance reversal took place
        if (
            splitStates.s100.s >= 2 &&
            splitStates.s75.s >= 2 &&
            splitStates.s50.s >= 2 &&
            splitStates.s25.s >= 2 &&
            splitStates.s15.s >= 2 &&
            splitStates.s10.s >= 2 &&
            splitStates.s5.s <= 0 &&
            splitStates.s2.s <= -1
        ) { stateEvent = 2 }

        // Check if a strong resistance reversal took place
        else if (
            splitStates.s100.s >= 1 &&
            splitStates.s75.s >= 1 &&
            splitStates.s50.s >= 1 &&
            splitStates.s25.s >= 1 &&
            splitStates.s15.s >= 1 &&
            splitStates.s10.s >= 1 &&
            splitStates.s5.s <= 0 &&
            splitStates.s2.s <= -1
        ) { stateEvent = 1 }

        // Finally, return the event
        return stateEvent;
    }











    /**
     * Retrieves a coin's full state based on its symbol.
     * @param symbol 
     * @returns ICoinState
     */
    public getCoinFullState(symbol: string): ICoinState {
        // Validate the request
        this.validateSymbol(symbol);
        if (!this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The full state of the coin cannot be retrieved because ${symbol} is not installed.`, 37000));
        }

        // Finally, return the state if it exists
        if (this.states[symbol]) { return this.states[symbol] }

        // Otherwise, return the default build
        else { return this.getDefaultFullCoinState() }
    }














    /* Websocket Connection */




    /**
     * Initializes the websocket connection to the mark prices.
     * If any issue arises, the system will attempt to fix it on
     * its own, otherwise, users will be notified.
     */
    private initializeWebsocketSubscription(): void {
        // Initialize the websocket instance
        this.ws = new WebSocket("wss://fstream.binance.com/ws/!markPrice@arr@1s");

        // Handle errors in the connection
        this.ws.on("error", (e) => {
            this._notification.coinWebsocketError(e);
            this._apiError.log("CoinsService.ws.error", e);
        });

        // Handle errors in the connection
        this.ws.on("close", () => {
            this._notification.coinWebsocketError("The websocket connection has been closed by Binance.");
            this._apiError.log("CoinsService.ws.error", "The websocket connection has been closed by Binance.");
            this.restartWebsocketConnection();
        });

        // Handle new pieces of data
        this.ws.on("message", (data?: string) => {
            if (data) {
                try {
                    // Initialize the current time
                    const currentTS: number = Date.now();

                    // Process the data
                    const processedData: IMarkPriceStreamDataItem[] = JSON.parse(data);

                    // Ensure there are items in the list
                    if (Array.isArray(processedData) && processedData.length) {
                        // Iterate over each item
                        processedData.forEach((item: IMarkPriceStreamDataItem) => {
                            // Handle installed symbols
                            if (this.installed[item.s]) {
                                // Init the mark price
                                const markPrice: number = <number>this._utils.outputNumber(item.p, {dp: this.installed[item.s].pricePrecision});

                                // Set the state in case it hasn't been
                                if (!this.states[item.s]) this.states[item.s] = this.getDefaultFullCoinState();

                                // Handle a state that already has prices in the window
                                if (this.states[item.s].w.length) {
                                    
                                    // Check if the last period ended
                                    const periodClose: number = 
                                        moment(this.states[item.s].w.at(-1).x).add(this.priceIntervalSeconds, "seconds").valueOf();

                                    // If it ended, append the new price and slice the list
                                    if (currentTS > periodClose) {
                                        this.states[item.s].w.push({ x: item.E, y: markPrice});
                                        this.states[item.s].w = this.states[item.s].w.slice(-this.priceWindowSize);
                                    }

                                    // Otherwise, update the current price
                                    else { this.states[item.s].w.at(-1).y = markPrice }
                                }

                                // Otherwise, initialize the list with the current values
                                else { this.states[item.s].w.push({ x: item.E, y: markPrice}) }
                            }
                        });

                        // Update the last websocket message
                        this.wsLastUpdate = currentTS;
                    }
                } catch (e) {
                    console.log(e);
                }
            }
        });
    }



    /**
     * Stops the websocket connection entirely if it has been established.
     */
    private stopWebsocketSubscription(): void {
        if (this.ws) {
            try {
                this.ws.terminate();
            } catch (e) { 
                console.log("Error when terminating the websocket connection.", e);
            }
            this.ws = undefined;
        }
    }





    /**
     * Stops the connection and attempts to start it again if possible.
     */
    private async restartWebsocketConnection(): Promise<void> {
        this.stopWebsocketSubscription();
        await this._utils.asyncDelay(5);
        this.initializeWebsocketSubscription();
    }





    /**
     * Ensures the websocket is fully connected and synced.
     * Otherwise, notifies the users and attempts to reset
     * the connection.
     */
    private async checkWebsocketStatus(): Promise<void> {
        if (
            typeof this.wsLastUpdate != "number" ||
            this.wsLastUpdate < moment().subtract(1, "minute").valueOf()
        ) {
            this._notification.coinWebsocketConnectionIssue();
            this.restartWebsocketConnection();
        }
    }














    /* Misc Helpers */





    /**
     * Retrieves the default state of the coins that is 
     * inserted into the market state.
     * @returns ICoinsState
     */
    public getDefaultState(): ICoinsState {
        return {}
    }







    /**
     * Retrieves the default full state for a coin.
     * @returns ICoinState
     */
    private getDefaultFullCoinState(): ICoinState {
        return {
            s: 0,
            ss: {
                s100: {s: 0, c: 0},
                s75: {s: 0, c: 0},
                s50: {s: 0, c: 0},
                s25: {s: 0, c: 0},
                s15: {s: 0, c: 0},
                s10: {s: 0, c: 0},
                s5: {s: 0, c: 0},
                s2: {s: 0, c: 0},
            },
            se: 0,
            set: null,
            w: []
        }
    }
}