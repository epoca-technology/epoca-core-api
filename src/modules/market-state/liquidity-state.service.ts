import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceOrderBook, IBinanceService } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    ILiquidityIntensityRequirements,
    ILiquidityPriceLevel,
    ILiquidityState,
    ILiquidityStateService,
    IMinifiedLiquidityState,
    IStateType,
    ILiquiditySideBuild,
    ILiquidityIntensity,
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
    private readonly intervalSeconds: number = 5;


    /**
     * Direction Requirements
     * The percent a side (asks/bids) must represent in order for the liquidity to
     * have a direction.
     */
    private readonly directionRequirement: number = 55;
    private readonly strongDirectionRequirement: number = 65;


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: ILiquidityState;



    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultFullState();
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
        // Calculate the state and initialize the interval
        await this.updateState();
        this.stateInterval = setInterval(async () => {
            try {
                await this.updateState();
            } catch (e) {
                console.log(e);
                this._apiError.log("LiquidityState.updateState", e);
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
     * State Management *
     ********************/

    






    /**
     * Retrieves the order book from Binance's Spot API, processes it and
     * builds the liquidity state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        // Firstly, retrieve the order book
        const orderBook: IBinanceOrderBook = await this._binance.getOrderBook();

        // Build both sides
        const asksBuild: ILiquiditySideBuild = this.buildLiquiditySide(orderBook.asks, "asks");
        const bidsBuild: ILiquiditySideBuild = this.buildLiquiditySide(orderBook.bids, "bids");

        // Finally, build the state
        this.state = {
            d: this.calculateDirection(asksBuild.total, bidsBuild.total),
            al: asksBuild.total,
            bl: bidsBuild.total,
            air: asksBuild.requirements,
            bir: bidsBuild.requirements,
            a: asksBuild.levels,
            b: bidsBuild.levels,
            ts: Date.now()
        }
    }







    /**
     * Given a list of orders (bids or asks) it will group them by unit and
     * return the fully formed price levels. Keep in mind that asks should be
     * ordered from low to high and bids from high to low.
     * @param rawOrders 
     * @param reverseOrder 
     * @returns ILiquiditySideBuild
     */
    private buildLiquiditySide(rawOrders: Array<[string, string]>, side: ILiquiditySide): ILiquiditySideBuild {
        // Init values
        let total: number = 0;
        let highest: number = 0;

        // Iterate over the raw orders and group them in units
        let sideOrders: {[price: number]: ILiquidityPriceLevel} = {};
        for (let order of rawOrders) {
            // Init the order values
            const price: number = Math.floor(Number(order[0]));
            const liquidity: number = Number(order[1]);

            // Update the side orders object accordingly
            if (sideOrders[price]) { 
                sideOrders[price].l += liquidity;
            } else { 
                sideOrders[price] = {
                    p: price,
                    l: liquidity,
                    li: 0 // Placeholder
                }
            }

            // Add the liquidity to the accumulator
            total += liquidity;

            // Check of the highest liquidity concentration
            highest = sideOrders[price].l > highest ? sideOrders[price].l: highest;
        }

        // Calculate the intensity requirements
        const requirements: ILiquidityIntensityRequirements = this.calculateIntensityRequirements(highest);

        // Build the levels whilst calculating the intensities
        let levels: ILiquidityPriceLevel[] = Object.values(sideOrders).map((pl) => { 
            return {
                p: pl.p,
                l: pl.l,
                li: this.calculateIntesity(pl.l, requirements)
            }
         });

        // Asks are ordered by price from low to high
        if (side == "asks") {
            levels.sort((a, b) => { return a.p - b.p });
        }

        // Bids are ordered by price from high to low
        else {
            levels.sort((a, b) => { return b.p - a.p });
        }

        // Finally, return the build
        return {
            total: total,
            requirements: requirements,
            levels: levels
        }
    }








    /**
     * Based on the highest liquidity for a side, it calculates the 3
     * intensity requirement levels.
     * @param highestLiquidity 
     * @returns ILiquidityIntensityRequirements
     */
    private calculateIntensityRequirements(highestLiquidity: number): ILiquidityIntensityRequirements {
        // Firstly, calculate the high requirement
        const requirementHigh: number = highestLiquidity / 2;

        // Now calculate the medium requirement
        const requirementMedium: number = requirementHigh / 2;
        
        // Finally, return the requirements
        return {
            l: requirementMedium / 2,
            m: requirementMedium,
            h: requirementHigh
        }
    }






    /**
     * Calculates the liquidity intensity of a level based on 
     * the side's requirements.
     * @param liquidity 
     * @param requirements 
     * @returns ILiquidityIntensity
     */
    private calculateIntesity(liquidity: number, requirements: ILiquidityIntensityRequirements): ILiquidityIntensity {
        if      (liquidity >= requirements.h) { return 3 }
        else if (liquidity >= requirements.m) { return 2 }
        else if (liquidity >= requirements.l) { return 1 }
        else                                  { return 0 }
    }










    /**
     * Calculates the direction based on the accumulated liquidity by
     * side.
     * @param askLiquidity 
     * @param bidLiquidity 
     * @returns IStateType
     */
    private calculateDirection(askLiquidity: number, bidLiquidity: number): IStateType {
        // Firstly, calculate the total liquidity
        const total: number = askLiquidity + bidLiquidity;

        // Calculate the shares
        const askShare: number = <number>this._utils.calculatePercentageOutOfTotal(askLiquidity, total);
        const bidShare: number = <number>this._utils.calculatePercentageOutOfTotal(bidLiquidity, total);

        // Finally, calculate the direction state
        if      (askShare >= this.strongDirectionRequirement)   { return -2 }
        else if (askShare >= this.directionRequirement)         { return -1 }
        else if (bidShare >= this.strongDirectionRequirement)   { return 2 }
        else if (bidShare >= this.directionRequirement)         { return 1 }
        else                                                    { return 0 }
    }










    


    /**************
     * Retrievers *
     **************/






    /**
     * Calculates the minified state based on the current price.
     * @param currentPrice 
     * @returns IMinifiedLiquidityState
     */
    public calculateState(currentPrice: number): IMinifiedLiquidityState {
        return {
            d: this.state.d,
            a: this.state.a.filter((pl) => pl.p >= currentPrice && pl.li > 0).map((pl) => { return { p: pl.p, li: pl.li }}),
            b: this.state.b.filter((pl) => pl.p <= currentPrice && pl.li > 0).map((pl) => { return { p: pl.p, li: pl.li }}),
        }
    }




    /**
     * Retrieves the ask price levels based on the current price.
     * Notice that all intensities will be included.
     * @param currentPrice 
     * @returns ILiquidityPriceLevel[]
     */
    public getAsks(currentPrice: number): ILiquidityPriceLevel[] {
        return this.state.a.filter((pl) => pl.p >= currentPrice).map((pl) => { return { p: pl.p, l: pl.l, li: pl.li }});
    }





    /**
     * Retrieves the bid price levels based on the current price.
     * Notice that all intensities will be included.
     * @param currentPrice 
     * @returns ILiquidityPriceLevel[]
     */
    public getBids(currentPrice: number): ILiquidityPriceLevel[] {
        return this.state.b.filter((pl) => pl.p <= currentPrice).map((pl) => { return { p: pl.p, l: pl.l, li: pl.li }});
    }











    /****************
     * Misc Helpers *
     ****************/





    /**
     * Retrieves the module's default state.
     * @returns ILiquidityState
     */
    private getDefaultFullState(): ILiquidityState {
        return {
            d: 0,
            bir: { l: 0, m: 0, h: 0 },
            air: { l: 0, m: 0, h: 0 },
            bl: 0,
            al: 0,
            b: [],
            a: [],
            ts: Date.now()
        }
    }





    /**
     * Retrieves the default state for an exchange.
     * @returns IMinifiedLiquidityState
     */
    public getDefaultState(): IMinifiedLiquidityState {
        return {
            d: 0,
            b: [],
            a: []
        }
    }
}