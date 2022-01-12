import {inject, injectable} from "inversify";
import moment = require("moment");
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
    IKeyZone,
    IStrategy
} from "./interfaces";
import { getStrategy } from "./forecast.strategies";




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
     private readonly priceActionCandlesticksRequirement: number = 30;




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
        fConfig.strategy = 'FP';

        // Retrieve the forecast & standard candlesticks
        const values: [ICandlestick[], ICandlestick[]] = await Promise.all([
            this._candlestick.get(startTimestamp, endTimestamp, true),      // 0 - Forecast Candlesticks
            this._candlestick.get(                                          // 1 - Standard Candlesticks
                moment(endTimestamp).subtract(fConfig.priceActionCandlesticksRequirement, "minutes").valueOf(), 
                endTimestamp
            )     
        ]);

        // Build the Key Zones State
        const state: IKeyZonesState = this._kz.getState(values[0], values[1], kzConfig);

        // Return the final result
        return {
            start: startTimestamp,
            end: endTimestamp,
            result: this.forecastTendency(state, getStrategy(fConfig.strategy)),
            state: state,
            candlesticks: fConfig.includeCandlesticksInResponse ? values[0]: undefined,
        };
    }







    /**
     * Executes a given strategy in case there has been a key zone touch.
     * @param state 
     * @param strategy
     * @returns ITendencyForecast
     */
     private forecastTendency(state: IKeyZonesState, strategy: IStrategy): ITendencyForecast {
        // Make sure there is an active state and the minimum reversals are met
        if (!state.akz || state.akz.r.length < strategy.minReversals) return 0;

        // Check if a support was touched
        if (state.ts) { return this.onKeyZoneTouch(false, state, strategy) }

        // Check if a resistance was touched
        else if (state.tr) { return this.onKeyZoneTouch(true, state, strategy) }

        // Otherwise stand neutral
        else { return 0 }
    }






    /**
     * Determines which forecast tendency to retrieve based on the type of key zone
     * touched and the strategy.
     * @param resistance 
     * @param state 
     * @param strategy 
     * @returns ITendencyForecast
     */
    private onKeyZoneTouch(resistance: boolean, state: IKeyZonesState, strategy: IStrategy): ITendencyForecast {
        // Retrieve the key zones from the current price
        const nextZones: IKeyZone[] = this._kz.getZonesFromPrice(state.p, state.kz, resistance);

        // If there are no zones above or below, stand neutral
        if (!nextZones.length) return 0;

        // Check if the reversal type needs to be respected
        if (
            strategy.respectReversalType && 
            (
                (
                    (resistance && state.akz.r.at(-1).t != 'r') ||
                    (!resistance && state.akz.r.at(-1).t != 's')
                )  && 
                (!strategy.allowMutations || !this._kz.zoneMutated(state.akz.r))
            )
        ) {
            return 0;
        }

        // Check if it needs and has more reversals than the next key zone
        if (strategy.moreReversalsThanNext && state.akz.r.length < nextZones[0].r.length) {
            return 0;
        }

        // Check if it has less reversals than the next one and if it should act on it
        if (strategy.actOnLessReversalsThanNext && state.akz.r.length < nextZones[0].r.length) {
            this.logState(state, resistance ? nextZones: undefined, resistance ? undefined: nextZones);
            return resistance ? 1: -1;
        }

        // Check if it needs and has more volume than the next key zone
        if (strategy.moreVolumeThanNext && state.akz.v < nextZones[0].v) {
            return 0;
        }

        // Check if it has less volume than the next one and if it should act on it
        if (strategy.actOnLessVolumeThanNext && state.akz.v < nextZones[0].v) {
            this.logState(state, resistance ? nextZones: undefined, resistance ? undefined: nextZones);
            return resistance ? 1: -1;
        }

        // Tendency Forecast
        this.logState(state, resistance ? nextZones: undefined, resistance ? undefined: nextZones);
        if (strategy.followPrice) {
            return resistance ? 1: -1;
        } else {
            return resistance ? -1: 1;
        }
    }


















    /* Misc Helpers */








    /**
     * Logs the keyzone state whenever there is a position forecast.
     * @param state 
     * @param above? 
     * @param below? 
     * @returns void
     */
     private logState(state: IKeyZonesState, above?: IKeyZone[], below?: IKeyZone[]): void {
        console.log(' ');console.log(' ');
        console.log(`Touched ${state.ts ? 'Support': 'Resistance'}: $${state.p}`, state.akz);
        if (above && above.length) console.log(`Zone Above (${above.length} total)`, above[0]);
        if (below && below.length) console.log(`Zone Below (${below.length} total)`, below[0]);
    }









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