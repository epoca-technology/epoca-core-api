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
     private readonly intervalMinutes: number = 600; // 5 hours




    /**
     * @priceActionCandlesticksRequirement
     * The number of 1 minute candlesticks that will be used to determine if a zone has been
     * touched.
     */
     private readonly priceActionCandlesticksRequirement: number = 15;




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
        const state: IKeyZonesState = this._kz.getState(
            candlesticks, 
            candlesticks1m.slice(candlesticks1m.length - fConfig.priceActionCandlesticksRequirement), 
            kzConfig
        );

        // Return the final result
        return {
            start: candlesticks1m[0].ot,
            end: candlesticks1m.at(-1).ct,
            result: this.forecastTendencyFromKeyZonesState(state, fConfig),
            state: state,
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
        // Check if the support zone is strong enough to hold
        if (
            state.touchedSupport  &&
            //state.activeZone.reversals.length >= 2 &&
            (state.activeZone.reversals.at(-1).type == 'support' && !state.activeZone.mutated) &&
            state.zonesBelow.length
        ) {
            this.logState(state);
            return 1;
        }

        // Check if the resistance zone is strong enough to hold
        else if (
            state.touchedResistance &&
            //state.activeZone.reversals.length >= 2 &&
            (state.activeZone.reversals.at(-1).type == 'resistance' && !state.activeZone.mutated) &&
            state.zonesAbove.length
        ) {
            this.logState(state);
            return -1;
        }

        // Otherwise, stand neutral.
        else { return 0 }
    }




    private logState(state): void {
        console.log(' ');console.log(' ');
        console.log(`Touched ${state.touchedSupport ? 'Support': 'Resistance'}: $${state.price}`, state.activeZone);
        console.log(`Zone Above (${state.zonesAbove.length})`, state.zonesAbove[0]);
        console.log(`Zone Below (${state.zonesBelow.length})`, state.zonesBelow[0]);
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
            priceActionCandlesticksRequirement: typeof config.priceActionCandlesticksRequirement == "number" ? config.priceActionCandlesticksRequirement: this.priceActionCandlesticksRequirement,
            includeCandlesticksInResponse: config.includeCandlesticksInResponse == true,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }
}