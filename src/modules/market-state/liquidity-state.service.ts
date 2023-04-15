import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceOrderBook, IBinanceService } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    ILiquidityPriceLevel,
    ILiquidityState,
    ILiquidityStateService,
    ILiquiditySideBuild,
    ILiquiditySide
} from "./interfaces";




@injectable()
export class LiquidityStateService implements ILiquidityStateService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    /**
     * Interval
     * Every intervalSeconds, the liquidity state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 4.5;

    /**
     * State
     * The local values used to build the liquidity state.
     */
    private asks: ILiquidityPriceLevel[] = [];
    private bids: ILiquidityPriceLevel[] = [];
    private buildTS: number;






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

        // Build both sides
        this.asks = this.buildPriceLevelsForSide(orderBook.asks, "asks");
        this.bids = this.buildPriceLevelsForSide(orderBook.bids, "bids");

        // Update the build ts
        this.buildTS = Date.now();
    }





    /**
     * Builds the price levels for a side.
     * @param rawOrders 
     * @param side 
     * @returns ILiquidityPriceLevel[]
     */
    private buildPriceLevelsForSide(
        rawOrders: Array<[string, string]>, 
        side: ILiquiditySide
    ): ILiquidityPriceLevel[] {
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
                if (levels.at(-1).p != price) { levels.push({ p: price, l: liquidity }) }

                // Otherwise, increment the liquidity on the level
                else { levels.at(-1).l += liquidity }
            }

            // Otherwise, set the level
            else { levels.push({ p: price, l: liquidity }) }
        }

        // Asks are ordered by price from low to high
        if (side == "asks") { levels.sort((a, b) => { return a.p - b.p }) }

        // Bids are ordered by price from high to low
        else { levels.sort((a, b) => { return b.p - a.p }) }

        // Finally, return the levels
        return levels;
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
        return {
            a: this.buildLiquidityForSide(currentPrice, "asks"),
            b: this.buildLiquidityForSide(currentPrice, "bids"),
            ts: this.buildTS
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
    private buildLiquidityForSide(currentPrice: number, side: ILiquiditySide): ILiquiditySideBuild {
        // Init values
        let total: number = 0;
        let levels: ILiquidityPriceLevel[] = [];

        // Build the asks
        if (side == "asks") {
            for (let ask of this.asks) {
                if (ask.p >= currentPrice) {
                    total += ask.l;
                    levels.push(ask);
                }
            }
        }

        // Build the bids
        else {
            for (let bid of this.bids) {
                if (bid.p <= currentPrice) {
                    total += bid.l;
                    levels.push(bid);
                }
            }
        }

        // Finally, pack and return the build
        return { t: total, l: levels}
    }






    










    /****************
     * Misc Helpers *
     ****************/








}