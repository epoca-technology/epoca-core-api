import {inject, injectable} from "inversify";
import { IKeyZonesState } from ".";
import { SYMBOLS } from "../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../shared/utilities";
import { 
    IKeyZonesService, 
    IKeyZonesConfig, 
} from "./interfaces";



@injectable()
export class KeyZonesService implements IKeyZonesService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;


    /**
     * @zoneSize
     * The zone's size percentage. The start and end prices are based on this value.
     */
    private readonly zoneSize: number = 1;



    /**
     * @reversalCountRequirement
     * The number of times a reverse needs to happen within a zone in order to be 
     * considered a key zone.
     */
    private readonly reversalCountRequirement: number = 1;



    /**
     * @verbose
     * Displays information based on the number set for debugging purposes
     */
    private readonly verbose: number = 0;




    constructor() {}






    /**
     * Given a series of candlesticks, it will build the current state to aid decision making.
     * @param candlesticks
     * @param config?
     * @returns IKeyZonesState
     */
    public getState(candlesticks: ICandlestick[], config?: IKeyZonesConfig): IKeyZonesState {
        // Init the config
        config = this.getConfig(config);

        // Init the state
        let state: IKeyZonesState = this.getInitialState(candlesticks.at(-1));




        // Return the final state
        return state;
    }



    













    /* Misc Helpers */








    /**
     * Given a config object, it will retrieve the final config values.
     * @param config 
     * @returns IForecastConfig
     */
    private getConfig(config?: IKeyZonesConfig): IKeyZonesConfig {
        config = config ? config: {};
        return {
            zoneSize: typeof config.zoneSize == "number" ? config.zoneSize: this.zoneSize,
            reversalCountRequirement: typeof config.reversalCountRequirement == "number" ? config.reversalCountRequirement: this.reversalCountRequirement,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }









    
    /**
     * Given the last candlestick, it will build the initial state.
     * @param last 
     * @returns IKeyZonesState
     */
    private getInitialState(last: ICandlestick): IKeyZonesState {
        return {
            price: last.c,
            takerBuyVolumePercent: <number>this._utils.calculatePercentageOutOfTotal(last.tbv, last.v, {ru: true, dp: 0}),
            zones: [],
            zonesAbove: [],
            zonesBelow: [],
            touchedResistance: false,
            brokeResistance: false,
            touchedSupport: false,
            brokeSupport: false
        }
    }
}