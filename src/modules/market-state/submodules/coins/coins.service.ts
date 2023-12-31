import {injectable, inject} from "inversify";
import { WebSocket } from "ws";
import * as moment from "moment";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../../../ioc";
import { IApiErrorService } from "../../../api-error";
import { 
    IBinanceService, 
    IBinanceExchangeInformation, 
    IBinanceExchangeInformationSymbol, 
    IMarkPriceStreamDataItem, 
    IBinanceCoinTicker
} from "../../../binance";
import { INotificationService } from "../../../notification";
import { ICandlestickService } from "../../../candlestick";
import { IUtilitiesService } from "../../../utilities";
import { IStateUtilities, IStateType, ISplitStates } from "../_shared";
import { 
    ICoinsService,
    ICoinsState,
    ICoinState,
    ICoinsSummary,
    ICoinsObject,
    ICoin,
    ICoinsScores,
    ICoinScore,
    ICoinsConfiguration,
    ICoinsCompressedState,
    ICoinCompressedState,
    ICoinsModel,
    ICoinsValidations
} from "./interfaces";




@injectable()
export class CoinsService implements ICoinsService {
    // Inject dependencies
    @inject(SYMBOLS.CoinsModel)                 private _model: ICoinsModel;
    @inject(SYMBOLS.CoinsValidations)           private _validations: ICoinsValidations;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.NotificationService)        private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.StateUtilities)             private _stateUtils: IStateUtilities;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;


    /**
     * Configuration
     * The configuration that will be used to build the coins and calculate
     * their states.
     */
    public config: ICoinsConfiguration;


    /**
     * BTC Symbol
     * The symbol that identifies Bitcoin.
     */
    private readonly btcSymbol: string = "BTCUSDT";


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
    private statesBTC: {[symbol: string]: ICoinState} = {};





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
        // Initalize the configuration
        await this.initializeConfiguration();

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
        }, this.config.supportedCoinsIntervalHours * 60 * 60 * 1000);

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
        this._validations.validateSymbol(symbol);
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
        this._validations.validateSymbol(symbol);
        if (this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be installed because it already is.`, 37001));
        }
        if (!this.supported[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be installed because it is not supported.`, 37002));
        }

        // Install the coin
        this.installed[symbol] = this.supported[symbol];
        this.states[symbol] = this.getDefaultFullCoinState();
        if (symbol != this.btcSymbol) this.statesBTC[symbol] = this.getDefaultFullCoinState();
        await this._model.updateInstalledCoins(this.installed);

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
        this._validations.validateSymbol(symbol);
        if (!this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The coin ${symbol} cannot be uninstalled because it is not currently installed.`, 37003));
        }

        // Delete the symbol accordingly
        delete this.installed[symbol];
        delete this.states[symbol];
        if (symbol != this.btcSymbol) delete this.statesBTC[symbol];
        await this._model.updateInstalledCoins(this.installed);

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
        this.installed = await this._model.getInstalledCoins();
        if (this.installed === undefined) {
            this.installed = {};
            this._model.createInstalledCoins(this.installed);
        }

        // Initialize the states
        this.states = {};
        this.statesBTC = {};
        for (let coinSymbol in this.installed) {
            this.states[coinSymbol] = this.getDefaultFullCoinState();
            if (coinSymbol != this.btcSymbol)  {
                this.statesBTC[coinSymbol] = this.getDefaultFullCoinState();
            }
        }
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
            let priceChangePercentBySymbol: {[symbol: string]: number} = {};
            for (let ticker of tickers) {
                // Ensure the ticker is marked as supported
                if (this.supported[ticker.symbol]) {
                    // Init the volume value and add it to the list
                    const vol: number = Number(ticker.quoteVolume);
                    supported.push({symbol: ticker.symbol, vol: vol});

                    // Add the volume to the accumulator
                    volAccum += vol;

                    // Add the price change percent to the dict
                    priceChangePercentBySymbol[ticker.symbol] = Number(ticker.priceChangePercent);
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
                    const score: ICoinScore = this.calculateCoinScore(
                        ticker.vol, 
                        low, 
                        medium, 
                        high, 
                        mean
                    );

                    // Set the score on the object
                    this.scores[ticker.symbol] = score;

                    // If the symbol is installed and the score is not good, notify users
                    if (this.installed[ticker.symbol] && score <= 3) {
                        await this._notification.installedLowScoreCoin(ticker.symbol);
                    }

                    // If the symbol is installed and the price has decreased 20%, notify users
                    if (
                        this.installed[ticker.symbol] && 
                        priceChangePercentBySymbol[ticker.symbol] <= -20
                    ) {
                        await this._notification.installedCoinIsCrashing(
                            ticker.symbol, 
                            priceChangePercentBySymbol[ticker.symbol]
                        );
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
    private calculateCoinScore(
        coinVolume: number, 
        low: number, 
        medium: number, 
        high: number, 
        mean: number
    ): ICoinScore {
        if      (coinVolume >= mean)    { return 5 }
        else if (coinVolume >= high)    { return 4 }
        else if (coinVolume >= medium)  { return 3 }
        else if (coinVolume >= low)     { return 2 }
        else                            { return 1 }
    }
















    






    /**********************
     * State Calculations *
     **********************/






    /**
     * Calculates the up-to-date state for all the coins and
     * returns the minified version.
     * @returns { coins: ICoinsState, coinsBTC: ICoinsState }
     */
    public calculateState(): { coins: ICoinsState, coinsBTC: ICoinsState } {
        // Init values
        let state: ICoinsState = { sbs: {}, cd: 0 };
        let stateBTC: ICoinsState = { sbs: {}, cd: 0 };
        let coinStates: IStateType[] = [];
        let coinStatesBTC: IStateType[] = [];

        // Iterate over each installed symbol
        for (let symbol in this.installed) { 
            // Calculate the full coin state
            this.calculateCoinState(symbol);

            // Insert the result into the minified state and add it to the list
            state.sbs[symbol] = { s: this.states[symbol].s };
            coinStates.push(this.states[symbol].s);

            // Calculate the state for the BTC Based
            if (symbol != this.btcSymbol) {
                stateBTC.sbs[symbol] = { s: this.statesBTC[symbol].s };
                coinStatesBTC.push(this.statesBTC[symbol].s);
            }
        }

        // Calculate the coins direction
        state.cd = this._stateUtils.calculateAverageState(coinStates);
        stateBTC.cd = this._stateUtils.calculateAverageState(coinStatesBTC);

        // Finally, return the state
        return { coins: state, coinsBTC: stateBTC};
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
        if (this.states[symbol] && this.states[symbol].w.length == this.config.priceWindowSize) {
            // Calculate and update the state based on USDT
            const usdtState: { averageState: IStateType, splitStates: ISplitStates } = 
                this._stateUtils.calculateCurrentState(
                    this.states[symbol].w, 
                    this.config.requirement, 
                    this.config.strongRequirement
                );
            this.states[symbol].s = usdtState.averageState;
            this.states[symbol].ss = usdtState.splitStates;

            // Calculate and update the state based on BTC if applies
            if (symbol != this.btcSymbol) {
                const btcState: { averageState: IStateType, splitStates: ISplitStates } = 
                    this._stateUtils.calculateCurrentState(
                        this.statesBTC[symbol].w, 
                        this.config.requirement, 
                        this.config.strongRequirement
                    );
                this.statesBTC[symbol].s = btcState.averageState;
                this.statesBTC[symbol].ss = btcState.splitStates;
            }
        }

        // If the state is not in the object, initialize it
        else if (!this.states[symbol]) {
            this.states[symbol] = this.getDefaultFullCoinState();
            if (symbol != this.btcSymbol) this.statesBTC[symbol] = this.getDefaultFullCoinState();
        }
    }


















    /**
     * Retrieves a coin's full state based on its symbol.
     * @param symbol 
     * @param btcPrice?
     * @returns ICoinState
     */
    public getCoinFullState(symbol: string, btcPrice?: boolean|string): ICoinState {
        // Validate the request
        this._validations.validateSymbol(symbol);
        if (!this.installed[symbol]) {
            throw new Error(this._utils.buildApiError(`The full state of the coin cannot be retrieved because ${symbol} is not installed.`, 37000));
        }
        
        // Finally, return the state if it exists
        if (this.states[symbol]) { 
            return btcPrice === true || btcPrice === "true" ? 
                this.statesBTC[symbol]: 
                this.states[symbol];
        }

        // Otherwise, return the default build
        else { return this.getDefaultFullCoinState() }
    }







    /**
     * Retrieves the compressed state for all the installed coins.
     * @returns ICoinsCompressedState
     */
    public getCoinsCompressedState(): ICoinsCompressedState {
        // Init the list of states as well as the compressed object
        let states: IStateType[] = [];
        let compressed: {[symbol: string]: ICoinCompressedState} = {};
        for (let symbol in this.states) {
            states.push(this.states[symbol].s);
            compressed[symbol] = {
                s: this.states[symbol].s,
                ss: this.states[symbol].ss
            };
        }
        return { csbs: compressed, cd: this._stateUtils.calculateAverageState(states)};
    }




    /**
     * Retrieves the compressed state for all the installed coins based
     * on their BTC price.
     * @returns ICoinsCompressedState
     */
    public getCoinsBTCCompressedState(): ICoinsCompressedState {
        // Init the list of states as well as the compressed object
        let states: IStateType[] = [];
        let compressed: {[symbol: string]: ICoinCompressedState} = {};
        for (let symbol in this.statesBTC) {
            states.push(this.statesBTC[symbol].s);
            compressed[symbol] = {
                s: this.statesBTC[symbol].s,
                ss: this.statesBTC[symbol].ss
            };
        }
        return { csbs: compressed, cd: this._stateUtils.calculateAverageState(states)};
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
                        // Init the current price of Bitcoin
                        const btcPrice: number = this._candlestick.predictionLookback.at(-1).c;

                        // Iterate over each item
                        processedData.forEach((item: IMarkPriceStreamDataItem) => {
                            // Handle installed symbols
                            if (this.installed[item.s]) {
                                // Init the mark price
                                const markPrice: number = <number>this._utils.outputNumber(item.p, {
                                    dp: this.installed[item.s].pricePrecision
                                });

                                // Set the state in case it hasn't been
                                if (!this.states[item.s]) {
                                    this.states[item.s] = this.getDefaultFullCoinState();
                                    if (item.s != this.btcSymbol) {
                                        this.statesBTC[item.s] = this.getDefaultFullCoinState();
                                    }
                                }

                                // Handle a state that already has prices in the window
                                if (this.states[item.s].w.length) {
                                    
                                    // Check if the last period ended
                                    const periodClose: number = 
                                        moment(this.states[item.s].w.at(-1).x).add(
                                            this.config.priceIntervalSeconds, 
                                            "seconds"
                                        ).valueOf();

                                    // If it ended, append the new price and slice the list
                                    if (currentTS > periodClose) {
                                        this.states[item.s].w.push({ x: item.E, y: markPrice});
                                        this.states[item.s].w = 
                                            this.states[item.s].w.slice(-this.config.priceWindowSize);
                                        if (item.s != this.btcSymbol) {
                                            this.statesBTC[item.s].w.push({ 
                                                x: item.E, 
                                                y: this.calculatePriceInBTC(btcPrice, markPrice)
                                            });
                                            this.statesBTC[item.s].w = 
                                                this.statesBTC[item.s].w.slice(
                                                    -this.config.priceWindowSize
                                                );
                                        }
                                    }

                                    // Otherwise, update the current price
                                    else { 
                                        this.states[item.s].w.at(-1).y = markPrice;
                                        if (item.s != this.btcSymbol) {
                                            this.statesBTC[item.s].w.at(-1).y = 
                                                this.calculatePriceInBTC(btcPrice, markPrice);
                                        }
                                    }
                                }

                                // Otherwise, initialize the list with the current values
                                else { 
                                    this.states[item.s].w.push({ x: item.E, y: markPrice});
                                    if (item.s != this.btcSymbol) {
                                        this.statesBTC[item.s].w.push({ 
                                            x: item.E, 
                                            y: this.calculatePriceInBTC(btcPrice, markPrice)
                                        });
                                    }
                                }
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
     * Calculates the current price of a coin in BTC.
     * @param btcPrice 
     * @param coinPrice 
     * @returns number
     */
    private calculatePriceInBTC(btcPrice: number, coinPrice: number): number {
        return <number>this._utils.outputNumber(new BigNumber(coinPrice).dividedBy(btcPrice), {
            dp: 12, 
            ru: true
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
     * @returns { coins: ICoinsState, coinsBTC: ICoinsState }
     */
    public getDefaultState(): { coins: ICoinsState, coinsBTC: ICoinsState } {
        return { coins: { sbs: {}, cd: 0 }, coinsBTC: { sbs: {}, cd: 0 }}
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
            w: []
        }
    }






















    /****************************
     * Configuration Management *
     ****************************/






    /**
     * Initializes the Coins's Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: ICoinsConfiguration|undefined = await this._model.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this._model.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Coins's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: ICoinsConfiguration): Promise<void> {
        // Validate the request
        this._validations.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this._model.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }







    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns ICoinsConfiguration
     */
    private buildDefaultConfig(): ICoinsConfiguration {
        return {
            supportedCoinsIntervalHours: 24,
            priceWindowSize: 128,
            priceIntervalSeconds: 15,
            requirement: 0.01,
            strongRequirement: 0.3
        }
    }
}