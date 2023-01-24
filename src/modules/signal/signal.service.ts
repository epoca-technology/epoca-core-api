import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IMarketStateService, IStateType } from "../market-state";
import { IPredictionService } from "../prediction";
import { IUtilitiesService } from "../utilities";
import { 
    ISignalService,
    ISignalDataset,
    ISignalSidePolicies
} from "./interfaces";


@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)           private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)          private _marketState: IMarketStateService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    /**
     * Active Signal
     * When the Prediction Model generates a new prediction, it is
     * evaluated against the issuance and cancellation policies. The
     * result is broadcasted through this observable.
     */
    private predictionSub?: Subscription;
    public active: BehaviorSubject<IPredictionResult> = new BehaviorSubject(0);



    /**
     * Long Policies
     * Issuance and cancellation policies for long signals.
     */
    private readonly long: ISignalSidePolicies = {
        // Issuance
        issuance: {
            technicals: {
                trend_sum: 0,
                trend_state: 3,
                trend_intensity: 2,
                ta_30m: 1,
                ta_1h: 1,
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
            },
            technicals_open_interest: {
                trend_sum: 0,
                trend_state: 3,
                trend_intensity: 2,
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
                open_interest: 1,
            },
            technicals_long_short_ratio: {
                trend_sum: 0,
                trend_state: 3,
                trend_intensity: 2,
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
                long_short_ratio: 1,
            },
            open_interest_long_short_ratio: {
                trend_sum: 0,
                trend_state: 3,
                trend_intensity: 2,
                open_interest: 1,
                long_short_ratio: 1,
            }
        },

        // Cancellation
        cancellation: {
            window: {
                window: 2
            },
            technicals: {
                ta_30m: -1,
                ta_1h: -1,
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
            },
            technicals_open_interest: {
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
                open_interest: -1,
            },
            technicals_long_short_ratio: {
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
                long_short_ratio: -1,
            },
            open_interest_long_short_ratio: {
                open_interest: -1,
                long_short_ratio: -1,
            }
        }
    }





    /**
     * Short Policies
     * Issuance and cancellation policies for short signals.
     */
    private readonly short: ISignalSidePolicies = {
        // Issuance
        issuance: {
            technicals: {
                trend_sum: 0,
                trend_state: -3,
                trend_intensity: -2,
                ta_30m: -1,
                ta_1h: -1,
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
            },
            technicals_open_interest: {
                trend_sum: 0,
                trend_state: -3,
                trend_intensity: -2,
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
                open_interest: -1
            },
            technicals_long_short_ratio: {
                trend_sum: 0,
                trend_state: -3,
                trend_intensity: -2,
                ta_2h: -1,
                ta_4h: -1,
                ta_1d: -1,
                long_short_ratio: -1
            },
            open_interest_long_short_ratio: {
                trend_sum: 0,
                trend_state: -3,
                trend_intensity: -2,
                open_interest: -1,
                long_short_ratio: -1
            }
        },

        // Cancellation
        cancellation: {
            window: {
                window: -2
            },
            technicals: {
                ta_30m: 1,
                ta_1h: 1,
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
            },
            technicals_open_interest: {
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
                open_interest: 1
            },
            technicals_long_short_ratio: {
                ta_2h: 1,
                ta_4h: 1,
                ta_1d: 1,
                long_short_ratio: 1
            },
            open_interest_long_short_ratio: {
                open_interest: 1,
                long_short_ratio: 1
            }
        }
    }




    constructor() {}










    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the connection with the prediction and any
     * other required modules.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Subscribe to the prediction stream
        this.predictionSub = this._prediction.active.subscribe((p: IPrediction|undefined) => {
            if (p) this.onNewPrediction(p);
        });
    }





    /**
     * Completes all the connections to external modules.
     */
    public stop(): void {
        if (this.predictionSub) this.predictionSub.unsubscribe();
        this.predictionSub = undefined;
    }










    /**************
     * Retrievers *
     **************/





    /**
     * Retrieves the issuance and cancellation policies for a side.
     * @param side 
     * @returns ISignalSidePolicies
     */
    public getPolicies(side: IBinancePositionSide): ISignalSidePolicies {
        // Validate the side
        if (side != "LONG" && side != "SHORT") {
            throw new Error(this._utils.buildApiError(`The provided side is invalid. Received: ${side}`, 35000));
        }

        // Return the policies accordingly
        return side == "LONG" ? this.long: this.short;
    }













    /***********************************
     * New Prediction Event Management *
     ***********************************/





    /**
     * Whenever a new prediction becomes available, it is 
     * evaluated and neutralized in case policy is met.
     * @param pred 
     */
    private onNewPrediction(pred: IPrediction): void {
        // Build the datasets
        const ds: ISignalDataset = this.makeDataset(pred);

        // Initialize the signal result
        let result: IPredictionResult = ds.result;

        /**
         * Signal Issuance Policies
         * If the prediction model is neutral, a non-neutral signal could be
         * generated based on a combination of indicators.
         */
        if (result == 0) {
            // Evaluate Technicals Policies
            result = this.evaluateTechnicalsIssuance(ds);

            // Evaluate Technicals Open Interest Policies
            if (result == 0) result = this.evaluateTechnicalsOpenInterestIssuance(ds);

            // Evaluate Technicals Long Short Ratio Policies
            if (result == 0) result = this.evaluateTechnicalsLongShortRatioIssuance(ds);

            // Evaluate Open Interest Long Short Ratio Policies
            if (result == 0) result = this.evaluateOpenInterestLongShortRatioIssuance(ds);
        }


        /**
         * Signal Cancellation Policies
         * If a non-neutral signal has been issued, it is evaluated against the
         * cancellation policies. Failing a single policy neutralizes the signal.
         */
        if (result != 0) {
            // Evaluate the Window Policies
            result = this.evaluateWindowCancellation(result, ds);

            // Evaluate the Technicals Policies
            if (result != 0) result = this.evaluateTechnicalsCancellation(result, ds); 

            // Evaluate Technicals Open Interest Policies
            if (result != 0) result = this.evaluateTechnicalsOpenInterestCancellation(result, ds); 

            // Evaluate Technicals Long Short Ratio Policies
            if (result != 0) result = this.evaluateTechnicalsLongShortRatioCancellation(result, ds); 

            // Evaluate Open Interest Long Short Ratio Policies
            if (result != 0) result = this.evaluateOpenInterestLongShortRatioCancellation(result, ds); 
        }

        // Finally, broadcast it
        this.active.next(result);
    }









    /****************************
     * Signal Issuance Policies *
     ****************************/



    /**
     * Evaluates the trend state & intensity as well as the current
     * technical analysis state.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals.trend_sum, ds.trendSum) &&
            ds.trendState >= this.long.issuance.technicals.trend_state &&
            ds.trendStateIntensity >= this.long.issuance.technicals.trend_intensity &&
            ds.marketState.technical_analysis["30m"].s.a >= this.long.issuance.technicals.ta_30m &&
            ds.marketState.technical_analysis["1h"].s.a >= this.long.issuance.technicals.ta_1h &&
            ds.marketState.technical_analysis["2h"].s.a >= this.long.issuance.technicals.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.long.issuance.technicals.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.long.issuance.technicals.ta_1d
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals.trend_sum, ds.trendSum) &&
            ds.trendState <= this.short.issuance.technicals.trend_state &&
            ds.trendStateIntensity <= this.short.issuance.technicals.trend_intensity &&
            ds.marketState.technical_analysis["30m"].s.a <= this.short.issuance.technicals.ta_30m &&
            ds.marketState.technical_analysis["1h"].s.a <= this.short.issuance.technicals.ta_1h &&
            ds.marketState.technical_analysis["2h"].s.a <= this.short.issuance.technicals.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.short.issuance.technicals.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.short.issuance.technicals.ta_1d
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }





    /**
     * Evaluates the trend state & intensity as well as the current
     * technical analysis and open interest states.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsOpenInterestIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals_open_interest.trend_sum, ds.trendSum) &&
            ds.trendState >= this.long.issuance.technicals_open_interest.trend_state &&
            ds.trendStateIntensity >= this.long.issuance.technicals_open_interest.trend_intensity &&
            ds.marketState.technical_analysis["2h"].s.a >= this.long.issuance.technicals_open_interest.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.long.issuance.technicals_open_interest.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.long.issuance.technicals_open_interest.ta_1d &&
            ds.marketState.open_interest.state >= this.long.issuance.technicals_open_interest.open_interest
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals_open_interest.trend_sum, ds.trendSum) &&
            ds.trendState <= this.short.issuance.technicals_open_interest.trend_state &&
            ds.trendStateIntensity <= this.short.issuance.technicals_open_interest.trend_intensity &&
            ds.marketState.technical_analysis["2h"].s.a <= this.short.issuance.technicals_open_interest.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.short.issuance.technicals_open_interest.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.short.issuance.technicals_open_interest.ta_1d &&
            ds.marketState.open_interest.state <= this.short.issuance.technicals_open_interest.open_interest
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }






    /**
     * Evaluates the trend state & intensity as well as the current
     * technical analysis and long short ratio states.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsLongShortRatioIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals_long_short_ratio.trend_sum, ds.trendSum) &&
            ds.trendState >= this.long.issuance.technicals_long_short_ratio.trend_state &&
            ds.trendStateIntensity >= this.long.issuance.technicals_long_short_ratio.trend_intensity &&
            ds.marketState.technical_analysis["2h"].s.a >= this.long.issuance.technicals_long_short_ratio.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.long.issuance.technicals_long_short_ratio.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.long.issuance.technicals_long_short_ratio.ta_1d &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.technicals_long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals_long_short_ratio.trend_sum, ds.trendSum) &&
            ds.trendState <= this.short.issuance.technicals_long_short_ratio.trend_state &&
            ds.trendStateIntensity <= this.short.issuance.technicals_long_short_ratio.trend_intensity &&
            ds.marketState.technical_analysis["2h"].s.a <= this.short.issuance.technicals_long_short_ratio.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.short.issuance.technicals_long_short_ratio.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.short.issuance.technicals_long_short_ratio.ta_1d &&
            ds.marketState.long_short_ratio.state <= this.short.issuance.technicals_long_short_ratio.long_short_ratio
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }





    /**
     * Evaluates the trend state & intensity as well as the current
     * open interest and long short ratio states.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateOpenInterestLongShortRatioIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.isTrendSumCompliying("LONG", this.long.issuance.open_interest_long_short_ratio.trend_sum, ds.trendSum) &&
            ds.trendState >= this.long.issuance.open_interest_long_short_ratio.trend_state &&
            ds.trendStateIntensity >= this.long.issuance.open_interest_long_short_ratio.trend_intensity &&
            ds.marketState.open_interest.state >= this.long.issuance.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.open_interest_long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.isTrendSumCompliying("SHORT", this.short.issuance.open_interest_long_short_ratio.trend_sum, ds.trendSum) &&
            ds.trendState <= this.short.issuance.open_interest_long_short_ratio.trend_state &&
            ds.trendStateIntensity <= this.short.issuance.open_interest_long_short_ratio.trend_intensity &&
            ds.marketState.open_interest.state <= this.short.issuance.open_interest_long_short_ratio.open_interest && 
            ds.marketState.long_short_ratio.state <= this.short.issuance.open_interest_long_short_ratio.long_short_ratio
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }








    /* Issuance Policy Helpers */





    /**
     * Verifies if the current trend sum is complying with the policy.
     * @param side 
     * @param policyTrendSum 
     * @param currentTrendSum 
     * @returns boolean
     */
    private isTrendSumCompliying(
        side: IBinancePositionSide, 
        policyTrendSum: IStateType,
        currentTrendSum: number
    ): boolean {
        // Evaluate a long policy
        if (side == "LONG" && policyTrendSum != 0)       { return currentTrendSum > 0 }

        // Evaluate a short policy
        else if (side == "SHORT" && policyTrendSum != 0) { return currentTrendSum < 0 }

        // Otherwise, the trend sum is compliying as it is not required
        else { return true }
    }














    /********************************
     * Signal Cancellation Policies *
     ********************************/






    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the window state.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateWindowCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (current == 1 && ds.marketState.window.state >= this.long.cancellation.window.window) {
            return 0;
        }

        // Evaluate a short signal
        else if (current == -1 && ds.marketState.window.state <= this.short.cancellation.window.window){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }





    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the technical analysis state.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            ds.marketState.technical_analysis["30m"].s.a <= this.long.cancellation.technicals.ta_30m &&
            ds.marketState.technical_analysis["1h"].s.a <= this.long.cancellation.technicals.ta_1h &&
            ds.marketState.technical_analysis["2h"].s.a <= this.long.cancellation.technicals.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.long.cancellation.technicals.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.long.cancellation.technicals.ta_1d
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["30m"].s.a >= this.short.cancellation.technicals.ta_30m &&
            ds.marketState.technical_analysis["1h"].s.a >= this.short.cancellation.technicals.ta_1h &&
            ds.marketState.technical_analysis["2h"].s.a >= this.short.cancellation.technicals.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.short.cancellation.technicals.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.short.cancellation.technicals.ta_1d
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the technical analysis and open interest states.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsOpenInterestCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            ds.marketState.technical_analysis["2h"].s.a <= this.long.cancellation.technicals_open_interest.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.long.cancellation.technicals_open_interest.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.long.cancellation.technicals_open_interest.ta_1d &&
            ds.marketState.open_interest.state <= this.long.cancellation.technicals_open_interest.open_interest
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["2h"].s.a >= this.short.cancellation.technicals_open_interest.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.short.cancellation.technicals_open_interest.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.short.cancellation.technicals_open_interest.ta_1d &&
            ds.marketState.open_interest.state >= this.short.cancellation.technicals_open_interest.open_interest
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the technical analysis and long short ratio states.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsLongShortRatioCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            ds.marketState.technical_analysis["2h"].s.a <= this.long.cancellation.technicals_long_short_ratio.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a <= this.long.cancellation.technicals_long_short_ratio.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a <= this.long.cancellation.technicals_long_short_ratio.ta_1d &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.technicals_long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["2h"].s.a >= this.short.cancellation.technicals_long_short_ratio.ta_2h &&
            ds.marketState.technical_analysis["4h"].s.a >= this.short.cancellation.technicals_long_short_ratio.ta_4h &&
            ds.marketState.technical_analysis["1d"].s.a >= this.short.cancellation.technicals_long_short_ratio.ta_1d &&
            ds.marketState.long_short_ratio.state >= this.short.cancellation.technicals_long_short_ratio.long_short_ratio
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the open interest and long short ratio states.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateOpenInterestLongShortRatioCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            ds.marketState.open_interest.state <= this.long.cancellation.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.open_interest_long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.open_interest.state >= this.short.cancellation.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state >= this.short.cancellation.open_interest_long_short_ratio.long_short_ratio
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }














    /****************
     * Misc Helpers *
     ****************/





    /**
     * Based on the latest prediction, it will build the dataset
     * in order to evaluate it against signal policies.
     * @param pred 
     * @returns ISignalDataset
     */
    private makeDataset(pred: IPrediction): ISignalDataset {
        return {
            result: pred.r,
            trendSum: pred.s,
            trendState: this._prediction.activeState,
            trendStateIntensity: this._prediction.activeStateIntesity,
            marketState: this._marketState.active.value
        }
    }
}
