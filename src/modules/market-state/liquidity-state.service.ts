import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IApiErrorService } from "../api-error";
import { IBinanceOrderBook, IBinanceService } from "../binance";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    ILiquidityPriceLevel,
    ILiquidityState,
    ILiquidityStateService,
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
    ILiquidityProcessedOrders
} from "./interfaces";




@injectable()
export class LiquidityStateService implements ILiquidityStateService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;


    /**
     * Configuration
     * The settings that will be used to build the liquidity and calculate the
     * state.
     */
    public config: ILiquidityConfiguration;


    /**
     * Price Levels
     * The full lists of asks and bids extracted and processed directly from the
     * order book. These values will be used to calculate the state. Note that
     * if the price is greater than an ask, means the price level no longer exists.
     * Same applies if the price is greater than a bid.
     */
    private asks: ILiquidityPriceLevel[] = [];
    private bids: ILiquidityPriceLevel[] = [];


    /**
     * Full State
     * The full state of the build that is used to calculate the state and is 
     * rebuilt every time new data comes in.
     */
    public state: IFullLiquidityState = {
        blp: 0,
        ap: {},
        bp: {},
        a: { t: 0, l: [] },
        b: { t: 0, l: [] },
        ppr: { current: 0, lower: 0, upper: 0},
        r: { low: 0, medium: 0, high: 0, veryHigh: 0 },
        ts: 0
    }


    /**
     * Interval
     * Every intervalSeconds, the order book will be retrieved and processed so
     * the liquidity state can be calculated.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 4.75; // 4.5 seconds gets the ip banned sometimes






    constructor() {}












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

        // Build the liquidity and initialize the interval
        await this.updateBuild();
        this.stateInterval = setInterval(async () => {
            try {
                await this.updateBuild();
            } catch (e) {
                console.log(e);
                this._apiError.log("LiquidityState.updateBuild", e);
            }
        }, this.intervalSeconds * 1000);
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.stateInterval) clearInterval(this.stateInterval);
        this.stateInterval = undefined;
    }



















    /********************
     * Build Management *
     ********************/

    






    /**
     * Retrieves the order book from Binance's Spot API, processes it and
     * builds the liquidity state.
     * @returns Promise<void>
     */
    private async updateBuild(): Promise<void> {
        // Firstly, retrieve the order book
        const orderBook: IBinanceOrderBook = await this._binance.getOrderBook();

        // Process the order book
        const { requirements, asks, bids } = this.processOrderBook(orderBook.asks, orderBook.bids);

        // Populate the local properties
        this.asks = asks;
        this.bids = bids;

        // Update the full state
        this.state.r = requirements;
        this.state.ts = Date.now();
    }






    /**
     * Builds the liquidity for both sides, calculates the intensity requirements
     * and then inserts them into each level.
     * @param askOrders 
     * @param bidOrders 
     * @returns ILiquidityProcessedOrders
     */
    private processOrderBook(askOrders: Array<[string, string]>, bidOrders: Array<[string, string]>): ILiquidityProcessedOrders {
        // Extract the price levels
        let asks: ILiquidityPriceLevel[] = this.buildPriceLevelsForSide(askOrders, "asks");
        let bids: ILiquidityPriceLevel[] = this.buildPriceLevelsForSide(bidOrders, "bids");

        // Calculate the requirements
        const requirements: ILiquidityIntensityRequirements = this.calculateRequirements(asks.concat(bids));

        // Finally, calculate the intensities per level and return the build
        return {
            requirements: requirements,
            asks: asks.map((ask) => { return { ...ask, li: this.calculateIntesity(ask.l, requirements)} }),
            bids: bids.map((bid) => { return { ...bid, li: this.calculateIntesity(bid.l, requirements)} })
        }
    }





    

    /**
     * Builds the price levels for a side.
     * @param rawOrders 
     * @param side 
     * @returns ILiquidityPriceLevel[]
     */
    private buildPriceLevelsForSide(rawOrders: Array<[string, string]>, side: ILiquiditySide): ILiquidityPriceLevel[] {
        // Firstly, initialize the levels
        let levels: ILiquidityPriceLevel[] = [];

        // Iterate over the raw orders and build the levels based on units
        for (let order of rawOrders) {
            // Init the order values
            const price: number = Math.floor(Number(order[0]));
            const liquidity: number = Number(order[1]);

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
	 * Calculates a level's intensity based on its liquidity and the
	 * requirements.
	 * @param liq 
	 * @param requirements 
	 * @returns ILiquidityIntensity
	 */
	private calculateIntesity(liq: number, requirements: ILiquidityIntensityRequirements): ILiquidityIntensity {
		if 		(liq >= requirements.veryHigh) 	{ return 4 }
		else if (liq >= requirements.high)  	{ return 3 }
		else if (liq >= requirements.medium)  	{ return 2 }
		else if (liq >= requirements.low)  		{ return 1 }
		else 									{ return 0 }
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

        // Build the liquidity for both sides
        this.state.a = this.buildLiquidityForSide("asks");
        this.state.b = this.buildLiquidityForSide("bids");

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
            lower: <number>this._utils.alterNumberByPercentage(currentPrice, -(this.config.max_peak_distance_from_price)),
            upper: <number>this._utils.alterNumberByPercentage(currentPrice, this.config.max_peak_distance_from_price)
        }
    }






    /**
     * Builds the liquidity object for a side. This build includes the total liquidity
     * as well as the levels. Note that price levels are picked based on the provided 
     * price.
     * @param currentPrice 
     * @param side 
     * @returns ILiquiditySideBuild
     */
    private buildLiquidityForSide(side: ILiquiditySide): ILiquiditySideBuild {
        // Init values
        let total: number = 0;
        let levels: ILiquidityPriceLevel[] = [];

        // Build the asks
        if (side == "asks") {
            for (let ask of this.asks) {
                if (ask.p >= this.state.ppr.current) {
                    total += ask.l;
                    levels.push(ask);
                }
            }
        }

        // Build the bids
        else {
            for (let bid of this.bids) {
                if (bid.p <= this.state.ppr.current) {
                    total += bid.l;
                    levels.push(bid);
                }
            }
        }

        // Finally, pack and return the build
        return { t: total, l: levels}
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
            bidLiquidityPower: <number>this._utils.calculatePercentageOutOfTotal(bidPoints, (askPoints + bidPoints)), 
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
        const config: ILiquidityConfiguration|undefined = await this.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: ILiquidityConfiguration): Promise<void> {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided liquidity config object is invalid.`, 26500));
        }
        if (!this._val.numberValid(newConfiguration.appbulk_stream_min_intensity, 1, 4)) {
            throw new Error(this._utils.buildApiError(`The provided appbulk_stream_min_intensity (${newConfiguration.appbulk_stream_min_intensity}) is invalid.`, 26504));
        }
        if (!this._val.numberValid(newConfiguration.max_peak_distance_from_price, 0.01, 5)) {
            throw new Error(this._utils.buildApiError(`The provided max_peak_distance_from_price (${newConfiguration.max_peak_distance_from_price}) is invalid.`, 26501));
        }
        if (!newConfiguration.intensity_weights || typeof newConfiguration.intensity_weights != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided intensity_weights config object is invalid.`, 26502));
        }
        if (
            !this._val.numberValid(newConfiguration.intensity_weights[1], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[2], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[3], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[4], 1, 100)
        ) {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`One of the provided intensity weights is invalid.`, 26503));
        }

        // Store the new config on the db and update the local property
        await this.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }











    /* Configuration Record Management */






    /**
     * Retrieves the Liquidity's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<ILiquidityConfiguration|undefined>
     */
    private async getConfigurationRecord(): Promise<ILiquidityConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.liquidity_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Liquidity's Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    private async createConfigurationRecord(defaultConfiguration: ILiquidityConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.liquidity_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Liquidity's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    private async updateConfigurationRecord(newConfiguration: ILiquidityConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.liquidity_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }







    /* Misc Helpers */



    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns ILiquidityConfiguration
     */
    private buildDefaultConfig(): ILiquidityConfiguration {
        return {
            appbulk_stream_min_intensity: 2,
            max_peak_distance_from_price: 0.5,
            intensity_weights: {
                1: 1,
                2: 3,
                3: 6,
                4: 9
            }
        }
    }
}