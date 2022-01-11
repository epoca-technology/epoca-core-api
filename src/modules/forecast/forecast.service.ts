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
    IKeyZonesService,
    IKeyZone
} from "./interfaces";



@injectable()
export class ForecastService implements IForecastService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;
    @inject(SYMBOLS.CandlestickService)         private _candlestick: ICandlestickService;
    @inject(SYMBOLS.KeyZonesService)            private _kz: IKeyZonesService;




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
    private readonly verbose: number = 1;




    constructor() {}






    /**
     * Given a series of 1m candlesticks, it will predict the next position to be taken.
     * @param startTimestamp
     * @param endTimestamp
     * @param fConfig?
     * @param keyZonesConfig?
     * @returns Promise<IForecastResult>
     */
    public async forecast(
        startTimestamp: number,
        endTimestamp: number,
        fConfig?: IForecastConfig,
        kzConfig?: IKeyZonesConfig,
    ): Promise<IForecastResult> {
        // Init config
        fConfig = this.getConfig(fConfig);

        // Retrieve the forecast & standard candlesticks
        const values: [ICandlestick[], ICandlestick[]] = await Promise.all([
            this._candlestick.get(startTimestamp, endTimestamp, true),                      // 0 - Forecast Candlesticks
            this._candlestick.getLast(false, fConfig.priceActionCandlesticksRequirement)    // 1 - Standard Candlesticks
        ]);

        // Build the Key Zones State
        const state: IKeyZonesState = this._kz.getState(values[0], values[1], kzConfig);

        // Return the final result
        return {
            start: startTimestamp,
            end: endTimestamp,
            result: this.forecastTendencyFromKeyZonesState(state, fConfig),
            state: state,
            candlesticks: fConfig.includeCandlesticksInResponse ? values[0]: undefined,
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
        /**
         * Check if the support zone is strong enough to hold the price action:
         * 1) A minimum of 3 reversals
         * 2) The reversal type must be a support or it must have mutated
         * 3) There must be at least 1 key zone below
         * 4) The number of reversals in the current key zone must be greater than the one below
         */
        if (
            state.tr  &&
            (state.akz.r[0].t == 's' || state.akz.m)
        ) {
            // Retrieve the zones below if any
            const below: IKeyZone[] = this._kz.getZonesFromPrice(state.p, state.kz, false);

            // Make sure there are zones below and that the current zone has as many or more reversals
            if (below.length && state.akz.r.length >= below[0].r.length) {
                if (config.verbose > 0) this.logState(state, [], below);
                return 1;
            }
        }

        /**
         * Check if the resistance zone is strong enough to hold the price action:
         * 1) A minimum of 3 reversals
         * 2) The reversal type must be a resistance or it must have mutated
         * 3) There must be at least 1 key zone above
         * 4) The number of reversals in the current key zone must be greater than the one above
         */
        else if (
            state.tr &&
            (state.akz.r[0].t == 'r'  || state.akz.m)
        ) {
            // Retrieve the zones above if any
            const above: IKeyZone[] = this._kz.getZonesFromPrice(state.p, state.kz, true);

            // Make sure there are zones below and that the current zone has as many or more reversals
            if (above.length && state.akz.r.length >= above[0].r.length) {
                if (config.verbose > 0) this.logState(state, above, []);
                return -1;
            }
        }

        // Otherwise, stand neutral.
        return 0;
    }












    /**
     * Logs the keyzone state whenever there is a position forecast.
     * @param state 
     * @returns void
     */
    private logState(state: IKeyZonesState, above: IKeyZone[], below: IKeyZone[]): void {
        console.log(' ');console.log(' ');
        console.log(`Touched ${state.ts ? 'Support': 'Resistance'}: $${state.p}`, state.akz);
        if (above.length) console.log(`Zone Above (${above.length})`, above[0]);
        if (below.length) console.log(`Zone Below (${below.length})`, below[0]);
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
            priceActionCandlesticksRequirement: typeof config.priceActionCandlesticksRequirement == "number" ? config.priceActionCandlesticksRequirement: this.priceActionCandlesticksRequirement,
            includeCandlesticksInResponse: config.includeCandlesticksInResponse == true,
            verbose: typeof config.verbose == "number" ? config.verbose: this.verbose,
        }
    }
}