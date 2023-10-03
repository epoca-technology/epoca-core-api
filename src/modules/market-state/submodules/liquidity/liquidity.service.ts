import {injectable, inject, postConstruct} from "inversify";
import { WebSocket } from "ws";
import * as moment from "moment";
import { SYMBOLS } from "../../../../ioc";
import { IApiErrorService } from "../../../api-error";
import { 
    IBinanceOrderBook, 
    IBinanceService, 
    IOrderBookStreamDataItem 
} from "../../../binance";
import { INotificationService } from "../../../notification";
import { IUtilitiesService } from "../../../utilities";
import { 
    ILiquidityPriceLevel,
    ILiquidityState,
    ILiquiditySideBuild,
    ILiquiditySide,
    ILiquidityConfiguration,
    ILiquidityIntensityRequirements,
    IFullLiquidityState,
    IMinifiedLiquidityState,
    ILiquidityPeaks,
    ILiquidityIntensity,
    ILiquidityPeaksPriceRange,
    ILiquidityPeaksState,
    ILiquidityRawOrders,
    ILiquidityService,
    ILiquidityModel,
    ILiquidityValidations,
} from "./interfaces";




@injectable()
export class LiquidityService implements ILiquidityService {
    // Inject dependencies
    @inject(SYMBOLS.LiquidityModel)                 private _model: ILiquidityModel;
    @inject(SYMBOLS.LiquidityValidations)           private _validations: ILiquidityValidations;
    @inject(SYMBOLS.BinanceService)                 private _binance: IBinanceService;
    @inject(SYMBOLS.NotificationService)            private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)                private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)               private _utils: IUtilitiesService;


    /**
     * Configuration
     * The settings that will be used to build the liquidity and calculate the
     * state.
     */
    public config: ILiquidityConfiguration;



    /**
     * Raw Orders
     * The raw orders returned by the exchange. These values are updated 
     * whenever the order book is synced and through the Websocket API.
     */
    private rawAsks: ILiquidityRawOrders = {}; // {price: liquidity}
    private rawBids: ILiquidityRawOrders = {}; // {price: liquidity}



    /**
     * Full State
     * The full state of the build that is used to calculate the state and is 
     * rebuilt every time new data comes in.
     */
    public state: IFullLiquidityState;
    private nextRequirementsCalculation: number|undefined = undefined;
    private readonly requirementsCalculationFrequencyMinutes: number = 2;



    /**
     * Order Book Sync Interval
     * Every syncIntervalSeconds, the order book will be fully synced straight
     * from the exchange's REST API.
     */
    private syncInterval: any;
    private readonly syncIntervalSeconds: number = 5; // 4.5 seconds gets the ip banned sometimes on the testnet



    /**
     * Websocket
     * Every wsIntervalSeconds, the system will make sure the websocket is in sync.
     * Otherwise, it will notify the users and attempt to restart the subscription.
     */
    private wsInterval: any;
    private readonly wsIntervalSeconds: number = 30;
    private wsLastUpdate: number;
    private ws: WebSocket;




    constructor() {}




    @postConstruct()
    public onInit(): void {
        // Set the default full state
        this.state = this.getDefaultFullState();

        // ...
    }








    /***************
     * Initializer *
     ***************/





    /**
     * Calculates the state and initializes the interval that will
     * update the state every intervalSeconds.
     * @returns  Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the configuration
        await this.initializeConfiguration();

        /**
         * The initialization process follows the following order:
         * 1) Order Book is fully synced
         * 2) Sync Interval is started
         * 3) Websocket Connection is established
         */
        await this.syncOrderBook();
        this.syncInterval = setInterval(async () => {
            try { await this.syncOrderBook() } 
            catch (e) {
                console.log(e);
                this._apiError.log("LiquidityState.syncOrderBook", e);
            }
        }, this.syncIntervalSeconds * 1000);
        this.wsInterval = setInterval(async () => {
            try {
                this.checkWebsocketStatus();
            } catch (e) {
                console.log(e);
                this._apiError.log("LiquidityState.checkWebsocketStatus", e);
            }
        }, this.wsIntervalSeconds * 1000);
        this.initializeWebsocketSubscription();
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = undefined;
        if (this.wsInterval) clearInterval(this.wsInterval);
        this.wsInterval = undefined;
        this.stopWebsocketSubscription();
    }






















    


    /*********************
     * State Calculation *
     *********************/






    /**
     * Calculates the minified state based on the current price.
     * @param currentPrice 
     * @returns ILiquidityState
     */
    public calculateState(currentPrice: number): ILiquidityState {
        // Firstly, calculate the state's price range
        this.state.ppr = this.calculatePeaksPriceRange(currentPrice);

        // Process the raw orders and build the liquidity by side
        const { asks, bids } = this.processRawOrders();
        this.state.a = this.buildLiquidityForSide(asks, "asks");
        this.state.b = this.buildLiquidityForSide(bids, "bids");

        // Calculate the peaks state
        const { bidLiquidityPower, bidPeaks, askPeaks } = this.calculatePeaksState();
        this.state.blp = bidLiquidityPower;
        this.state.ap = askPeaks;
        this.state.bp = bidPeaks;

        // Finally, return the standard build
        return {
            blp: this.state.blp,
            ap: this.state.ap,
            bp: this.state.bp,
            a: this.state.a,
            b: this.state.b,
        }
    }





    /**
     * Calculates the peaks price range that will be used to select
     * the peaks that are nearby the current price.
     * @param currentPrice 
     * @returns ILiquidityPeaksPriceRange
     */
    private calculatePeaksPriceRange(currentPrice: number): ILiquidityPeaksPriceRange {
        return {
            current: currentPrice,
            lower: <number>this._utils.alterNumberByPercentage(
                currentPrice, 
                -(this.config.max_peak_distance_from_price)
            ),
            upper: <number>this._utils.alterNumberByPercentage(
                currentPrice, 
                this.config.max_peak_distance_from_price
            )
        }
    }






    /**
     * Builds the liquidity object for a side. This build includes the total liquidity
     * as well as the levels. Note that price levels are picked based on the provided 
     * price.
     * @param levels 
     * @param side 
     * @returns ILiquiditySideBuild
     */
    private buildLiquidityForSide(
        levels: ILiquidityPriceLevel[], 
        side: ILiquiditySide
    ): ILiquiditySideBuild {
        // Init values
        let total: number = 0;
        let finalLevels: ILiquidityPriceLevel[] = [];

        // Build the asks
        if (side == "asks") {
            for (let ask of levels) {
                if (ask.p >= this.state.ppr.current) {
                    total += ask.l;
                    finalLevels.push(ask);
                }
            }
        }

        // Build the bids
        else {
            for (let bid of levels) {
                if (bid.p <= this.state.ppr.current) {
                    total += bid.l;
                    finalLevels.push(bid);
                }
            }
        }

        // Finally, pack and return the build
        return { t: total, l: finalLevels}
    }










    /**
     * Calculates the peak states for both sides and then
     * the bid liquidity power.
     * @returns ILiquidityPeaksState
     */
    private calculatePeaksState(): ILiquidityPeaksState {
        // Init values
        let askPeaks: ILiquidityPeaks = {};
        let askPoints: number = 0;
        let bidPeaks: ILiquidityPeaks = {};
        let bidPoints: number = 0;

        // Iterate over each ask, populating the peaks and accumulating the points
        for (let ask of this.state.a.l) {
            if (ask.li > 0 && ask.p <= this.state.ppr.upper) {
                askPeaks[ask.p] = ask.li;
                askPoints += ask.li * this.config.intensity_weights[ask.li];
            }
        }

        // Iterate over each bid, populating the peaks and accumulating the points
        for (let bid of this.state.b.l) {
            if (bid.li > 0 && bid.p >= this.state.ppr.lower) {
                bidPeaks[bid.p] = bid.li;
                bidPoints += bid.li * this.config.intensity_weights[bid.li];
            }
        }

        // Finally, return the state
        return { 
            bidLiquidityPower: <number>this._utils.calculatePercentageOutOfTotal(
                bidPoints, 
                (askPoints + bidPoints)
            ), 
            bidPeaks: bidPeaks, 
            askPeaks: askPeaks 
        };
    }













    /**
     * Builds the minified liquidity state based on the current full state.
     * If appBulkStreamFormat is provided, it will filter the peaks that
     * dont meet the intensity requirements.
     * @param appBulkStreamFormat 
     * @returns IMinifiedLiquidityState
     */
    public getMinifiedState(appBulkStreamFormat?: boolean): IMinifiedLiquidityState {
        // Init the peaks object
        let askPeaks: ILiquidityPeaks = {};
        let bidPeaks: ILiquidityPeaks = {};

        // Filter the weaker peaks if the state will be stored in the appbulk stream
        if (appBulkStreamFormat) {
            for (let askPrice in this.state.ap) {
                if (this.state.ap[askPrice] >= this.config.appbulk_stream_min_intensity) {
                    askPeaks[askPrice] = this.state.ap[askPrice];
                }
            }
            for (let bidPrice in this.state.bp) {
                if (this.state.bp[bidPrice] >= this.config.appbulk_stream_min_intensity) {
                    bidPeaks[bidPrice] = this.state.bp[bidPrice];
                }
            }
        }

        // Otherwise, set whatever is active
        else {
            askPeaks = this.state.ap;
            bidPeaks = this.state.bp;
        }

        // Finally, return the minified state
        return { blp: this.state.blp, ap: askPeaks, bp: bidPeaks }
    }









    /**
     * Retrieves the default full liquidity state object.
     * @returns IFullLiquidityState
     */
    public getDefaultFullState(): IFullLiquidityState {
        return {
            blp: 0,
            ap: {},
            bp: {},
            a: { t: 0, l: [] },
            b: { t: 0, l: [] },
            ppr: { current: 0, lower: 0, upper: 0},
            r: { low: 0, medium: 0, high: 0, veryHigh: 0 },
            ts: 0
        }
    }







    /**
     * Retrieves the default liquidity state object.
     * @returns ILiquidityState
     */
    public getDefaultState(): ILiquidityState {
        return {
            blp: 0,
            ap: {},
            bp: {},
            a: { t: 0, l: [] },
            b: { t: 0, l: [] },
        }
    }


    















    /******************************
     * Order Book Sync Management *
     ******************************/

    




    /**
     * Retrieves the full order book from the exchange and updates the
     * local propeties.
     * @returns Promise<void>
     */
    private async syncOrderBook(): Promise<void> {
        // Firstly, retrieve the order book
        const orderBook: IBinanceOrderBook = await this._binance.getOrderBook();

        // Populate the local properties
        this.rawAsks = Object.fromEntries(orderBook.asks);
        this.rawBids = Object.fromEntries(orderBook.bids);

        // Update the full state
        this.state.ts = Date.now();
    }








    /**
     * Processes the raw orders straight from the order book and
     * outputs the price level list per side.
     * @returns { asks: ILiquidityPriceLevel[], bids: ILiquidityPriceLevel[] }
     */
    private processRawOrders(): { asks: ILiquidityPriceLevel[], bids: ILiquidityPriceLevel[] } {
        // Extract the price levels for both sides
        let asks: ILiquidityPriceLevel[] = this.buildPriceLevels("asks");
        let bids: ILiquidityPriceLevel[] = this.buildPriceLevels("bids");

        // Check if the requirements have to be calculated
        if (!this.nextRequirementsCalculation || Date.now() >= this.nextRequirementsCalculation) {
            this.state.r = this.calculateRequirements(asks.concat(bids));
            this.nextRequirementsCalculation = moment().add(
                this.requirementsCalculationFrequencyMinutes, "minutes"
            ).valueOf();
        }

        // Finally, calculate the intensities per level and return the build
        return {
            asks: asks.map((ask) => { return { ...ask, li: this.calculateIntesity(
                ask.l, 
                this.state.r
            )} }),
            bids: bids.map((bid) => { return { ...bid, li: this.calculateIntesity(
                bid.l, 
                this.state.r
            )} })
        }
    }








    /**
     * Builds the price levels for a side based on the raw orders.
     * @param side 
     * @returns ILiquidityPriceLevel[]
     */
    private buildPriceLevels(side: ILiquiditySide): ILiquidityPriceLevel[] {
        // Firstly, initialize the levels
        let levels: ILiquidityPriceLevel[] = [];

        // Iterate over the raw orders and build the levels based on units
        const rawOrders: ILiquidityRawOrders = side == "asks" ? this.rawAsks: this.rawBids;
        for (let rawPrice in rawOrders) {
            // Init the order values
            const price: number = Math.floor(Number(rawPrice));
            const liquidity: number = Number(rawOrders[rawPrice]);

            // Check if levels have already been aded
            if (levels.length > 0) {
                // If the current order's price is different to the last one, add the new level
                if (levels.at(-1).p != price) { levels.push({ p: price, l: liquidity, li: 0 }) }

                // Otherwise, increment the liquidity on the level
                else { levels.at(-1).l += liquidity }
            }

            // Otherwise, set the level
            else { levels.push({ p: price, l: liquidity, li: 0 }) }
        }

        // Asks are ordered by price from low to high
        if (side == "asks") { levels.sort((a, b) => { return a.p - b.p }) }

        // Bids are ordered by price from high to low
        else { levels.sort((a, b) => { return b.p - a.p }) }

        // Finally, return the levels
        return levels;
    }






	/**
	 * Calculates the intensity requirements for a side.
	 * @param levels 
	 * @returns ILiquidityIntensityRequirements
	 */
	private calculateRequirements(levels: ILiquidityPriceLevel[]): ILiquidityIntensityRequirements {
		// Init values
		let accum: number = 0;
		let lowest: number = 0;
		let highest: number = 0;

		// Iterate over each level, populating the values
		for (let level of levels) {
			accum += level.l;
			lowest = lowest == 0 || level.l < lowest ? level.l: lowest;
			highest = level.l > highest ? level.l: highest;
		}

		// Calculate the requirements
		const mean: number = <number>this._utils.outputNumber(accum / levels.length);
		const meanLow: number = <number>this._utils.calculateAverage([mean, lowest]);
		const meanVeryHigh: number = <number>this._utils.calculateAverage([mean, highest]);
		const meanHigh: number = <number>this._utils.calculateAverage([mean, meanVeryHigh]);
		const meanHighAdj: number = <number>this._utils.calculateAverage([mean, meanHigh]);
		const meanMedium: number = <number>this._utils.calculateAverage([mean, meanHighAdj]);
		const meanMediumAdj: number = <number>this._utils.calculateAverage([mean, meanMedium]);
        const meanLowMedium: number = <number>this._utils.calculateAverage([meanLow, meanMediumAdj]);

		// Finally, return the requirements
		return {
			low: meanLow,
			medium: meanLowMedium,
			high: meanMediumAdj,
			veryHigh: meanHighAdj
		}
	}








	/**
	 * Calculates a level's intensity based on its liquidity and the
	 * requirements.
	 * @param liq 
	 * @param requirements 
	 * @returns ILiquidityIntensity
	 */
	private calculateIntesity(
        liq: number, 
        requirements: ILiquidityIntensityRequirements
    ): ILiquidityIntensity {
		if 		(liq >= requirements.veryHigh) 	{ return 4 }
		else if (liq >= requirements.high)  	{ return 3 }
		else if (liq >= requirements.medium)  	{ return 2 }
		else if (liq >= requirements.low)  		{ return 1 }
		else 									{ return 0 }
	}









    /* Websocket Connection */




    /**
     * Initializes the websocket connection to the mark prices.
     * If any issue arises, the system will attempt to fix it on
     * its own, otherwise, users will be notified.
     */
    private initializeWebsocketSubscription(): void {
        // Initialize the websocket instance
        this.ws = new WebSocket("wss://stream.binance.com/ws/btcusdt@depth@100ms");

        // Handle errors in the connection
        this.ws.on("error", (e) => {
            this._notification.liquidityWebsocketError(e);
            this._apiError.log("LiquidityService.ws.error", e);
        });

        // Handle errors in the connection
        this.ws.on("close", () => {
            this._notification.liquidityWebsocketError("The websocket connection has been closed by Binance.");
            this._apiError.log("LiquidityService.ws.error", "The websocket connection has been closed by Binance.");
            this.restartWebsocketConnection();
        });

        // Handle new pieces of data
        this.ws.on("message", (data?: string) => {
            if (data) {
                try {
                    // Process the data
                    const processedData: IOrderBookStreamDataItem = JSON.parse(data);

                    // Ensure the data can be processed and the event took place after the last sync
                    if (
                        processedData && 
                        processedData.E &&
                        processedData.E >= this.state.ts &&
                        this.state.ppr.current > 0 &&
                        Array.isArray(processedData.a) &&
                        Array.isArray(processedData.b)
                    ) {
                        // Update the timestamp
                        this.wsLastUpdate = processedData.E;

                        // Update the asks if the price is greater than or equals to the 
                        for (let ask of processedData.a) {
                            // Init the price so it matches the keys extracted from the REST endpoint
                            const askPrice: string = <string>this._utils.outputNumber(ask[0], {
                                dp: 2, 
                                of: "s"
                            });

                            // If the liquidity is zero, delete the level
                            if (ask[1] == "0.00000000") {
                                delete this.rawAsks[askPrice];
                            } 
                            
                            // If the price is within the peaks' range, update the level
                            else if (Number(askPrice) <= this.state.ppr.upper) {
                                this.rawAsks[askPrice] = ask[1];
                            }
                        }

                        // Update the bids
                        for (let bid of processedData.b) {
                            // Init the price so it matches the keys extracted from the REST endpoint
                            const bidPrice: string = <string>this._utils.outputNumber(bid[0], {
                                dp: 2, 
                                of: "s"
                            });

                            // If the liquidity is zero, delete the level
                            if (bid[1] == "0.00000000") {
                                delete this.rawBids[bidPrice];
                            } 
                            
                            // If the price is within the peaks' range, update the level
                            else if (Number(bidPrice) >= this.state.ppr.lower) {
                                this.rawBids[bidPrice] = bid[1];
                            }
                        }
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
            this._notification.liquidityWebsocketConnectionIssue();
            this.restartWebsocketConnection();
        }
    }





















    /****************************
     * Configuration Management *
     ****************************/






    /**
     * Initializes the Liquidity's Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: ILiquidityConfiguration|undefined = await this._model.getConfigurationRecord();

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
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: ILiquidityConfiguration): Promise<void> {
        // Validate the request
        this._validations.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this._model.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }






    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns ILiquidityConfiguration
     */
    private buildDefaultConfig(): ILiquidityConfiguration {
        return {
            appbulk_stream_min_intensity: 4,
            max_peak_distance_from_price: 0.35,
            intensity_weights: {
                1: 1,
                2: 3,
                3: 6,
                4: 9
            }
        }
    }
}