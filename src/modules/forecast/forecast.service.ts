import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IUtilitiesService } from "../shared/utilities";
import { 
    IForecastConfig,
    IForecastResult, 
    IForecastService, 
    IKeyZonesConfig, 
    ITendencyForecast,
    IKeyZonesState,
    IKeyZonesService
} from "./interfaces";



@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.KeyZonesService)            private _kz: IKeyZonesService;



    /**
     * @intervalMinutes
     * The interval that will be set on the 1m candlesticks before building the key zones.
     */
     private readonly intervalMinutes: number = 300;





    /**
     * @verbose
     * Displays information based on the number set for debugging purposes
     */
    private readonly verbose: number = 0;




    constructor() {}






    /**
     * Given a series of 1m candlesticks, it will predict the next position to be taken.
     * @param candlesticks1m?
     * @param startTimestamp?
     * @param endTimestamp?
     * @param fConfig?
     * @param keyZonesConfig?
     * @returns Promise<IForecastResult>
     */
    public async forecast(
        candlesticks1m?: ICandlestick[],
        startTimestamp?: number,
        endTimestamp?: number,
        fConfig?: IForecastConfig,
        kzConfig?: IKeyZonesConfig,
    ): Promise<IForecastResult> {
        // Init config
        fConfig = this.getConfig(fConfig);

        // Check if the candlesticks were provided, otherwise retrieve them
        if (!candlesticks1m || !candlesticks1m.length) {
            // Make sure the timestamps were provided
            if (typeof startTimestamp != "number" || typeof endTimestamp != "number") {
                throw new Error(`The startTimestamp ${startTimestamp} and/or the endTimestamp ${endTimestamp} are invalid.`);
            }

            // Verbose
            if (fConfig.verbose > 0) console.log(`Retrieving candlesticks from ${startTimestamp} to ${endTimestamp}.`);

            // Retrieve the candlesticks
            candlesticks1m = await this._candlestick.get(startTimestamp, endTimestamp);
        }

        // Scale the candlesticks according to the provided interval
        const candlesticks: ICandlestick[] = this._candlestick.alterInterval(candlesticks1m, fConfig.intervalMinutes);

        // Build the Key Zones State
        const kzState: IKeyZonesState = this._kz.getState(candlesticks, kzConfig);

        // Return the final result
        return {
            result: this.forecastTendencyFromKeyZonesState(kzState, fConfig),
            keyZonesState: kzState,
            candlesticks: fConfig.includeCandlesticksInResponse ? candlesticks: undefined,
        };
    }



    



    /**
     * Given the keyzones state and the configuration, it will determine the next tendency
     * to be followed.
     * @param state
     * @param config
     * @returns ITendencyForecast
     */
    private forecastTendencyFromKeyZonesState(state: IKeyZonesState, config: IForecastConfig): ITendencyForecast {
        return 0;
    }













    /* Misc Helpers */




    /**
     * Given a config object, it will retrieve the final config values.
     * @param config 
     * @returns IForecastConfig
     */
    private getConfig(config?: IForecastConfig): IForecastConfig {
        config = config ? config: {};
        return {
            intervalMinutes: typeof config.intervalMinutes == "number" ? config.intervalMinutes: this.intervalMinutes,
            includeCandlesticksInResponse: config.includeCandlesticksInResponse == true,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }
}