import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IMarketStateService } from "../market-state";
import { IPredictionService } from "../prediction";
import { IUtilitiesService } from "../utilities";
import { 
    ISignalService,
    ISignalDataset,
    ISignalSidePolicies,
    ISignalValidations,
    ISignalModel,
    ISignalPolicies,
    IIssuancePolicy,
    ITechnicalsBasedIssuancePolicy,
    ITechnicalsBasedCancellationPolicy,
    ITrendSumState,
    IVolumeBasedIssuancePolicy,
    IVolumeBasedCancellationPolicy
} from "./interfaces";


@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)           private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)          private _marketState: IMarketStateService;
    @inject(SYMBOLS.SignalValidations)           private _validations: ISignalValidations;
    @inject(SYMBOLS.SignalModel)                 private _model: ISignalModel;
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
    private long: ISignalSidePolicies;





    /**
     * Short Policies
     * Issuance and cancellation policies for short signals.
     */
    private short: ISignalSidePolicies;




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
        // Initialize the policies
        await this.initializePolicies();
        
        // Subscribe to the prediction stream
        this.predictionSub = this._prediction.active.subscribe((p: IPrediction|undefined) => {
            try { if (p) this.onNewPrediction(p) } catch (e) { console.log(e)}
        });
    }





    /**
     * Completes all the connections to external modules.
     */
    public stop(): void {
        if (this.predictionSub) this.predictionSub.unsubscribe();
        this.predictionSub = undefined;
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
            // Evalute Volume Policies
            result = this.evaluateVolumeIssuance(ds);

            // Evaluate Technicals Policies
            if (result == 0) result = this.evaluateTechnicalsIssuance(ds);

            // Evaluate Open Interest Policies
            if (result == 0) result = this.evaluateOpenInterestIssuance(ds);

            // Evaluate Long/Short Ratio Policies
            if (result == 0) result = this.evaluateLongShortRatioIssuance(ds);

            // Evaluate Volume Technicals Policies
            if (result == 0) result = this.evaluateVolumeTechnicalsIssuance(ds);

            // Evaluate Volume Open Interest Policies
            if (result == 0) result = this.evaluateVolumeOpenInterestIssuance(ds);

            // Evaluate Volume Long/Short Ratio Policies
            if (result == 0) result = this.evaluateVolumeLongShortRatioIssuance(ds);

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

            // Evaluate the Volume Policies
            if (result != 0) result = this.evaluateVolumeCancellation(result, ds); 

            // Evaluate the Technicals Policies
            if (result != 0) result = this.evaluateTechnicalsCancellation(result, ds); 

            // Evaluate Open Interest Policies
            if (result != 0) result = this.evaluateOpenInterestCancellation(result, ds); 

            // Evaluate Long/Short Ratio Policies
            if (result != 0) result = this.evaluateLongShortRatioCancellation(result, ds); 

            // Evaluate the Volume Technicals Policies
            if (result != 0) result = this.evaluateVolumeTechnicalsCancellation(result, ds); 

            // Evaluate the Volume Open Interest Policies
            if (result != 0) result = this.evaluateVolumeOpenInterestCancellation(result, ds); 

            // Evaluate the Volume Long Short Ratio Policies
            if (result != 0) result = this.evaluateVolumeLongShortRatioCancellation(result, ds); 

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
     * Evaluates the trend state & intensity as well as the volume state & direction.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.volume.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.volume.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.volume, ds) &&
            this.isVolumeCompliying("LONG", this.long.issuance.volume, ds)
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.volume.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.volume.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.volume, ds) &&
            this.isVolumeCompliying("SHORT", this.short.issuance.volume, ds)
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }







    /**
     * Evaluates the trend state & intensity as well as the current
     * technical analysis state.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateTechnicalsIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.technicals.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.technicals, ds) &&
            this.isTACompliying("LONG", this.long.issuance.technicals, ds)
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.technicals.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.technicals, ds) &&
            this.isTACompliying("SHORT", this.short.issuance.technicals, ds)
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }





    /**
     * Evaluates the trend state & intensity as well as the open interest state.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateOpenInterestIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.open_interest.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.open_interest, ds) &&
            ds.marketState.open_interest.state >= this.long.issuance.open_interest.open_interest
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.open_interest.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.open_interest, ds) &&
            ds.marketState.open_interest.state <= this.short.issuance.open_interest.open_interest
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }





    /**
     * Evaluates the trend state & intensity as well as the long/short ratio state.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateLongShortRatioIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.long_short_ratio.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.long_short_ratio.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state <= this.short.issuance.long_short_ratio.long_short_ratio
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }






    /**
     * Evaluates the trend state & intensity as well as the current
     * volume and technical analysis.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeTechnicalsIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.volume_technicals.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.volume_technicals.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.volume_technicals, ds) &&
            this.isVolumeCompliying("LONG", this.long.issuance.volume_technicals, ds) &&
            this.isTACompliying("LONG", this.long.issuance.volume_technicals, ds)
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.volume_technicals.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.volume_technicals.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.volume_technicals, ds) &&
            this.isVolumeCompliying("SHORT", this.short.issuance.volume_technicals, ds) &&
            this.isTACompliying("SHORT", this.short.issuance.volume_technicals, ds)
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }






    /**
     * Evaluates the trend state & intensity as well as the current
     * volume and open interest states.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeOpenInterestIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.volume_open_interest.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.volume_open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.volume_open_interest, ds) &&
            this.isVolumeCompliying("LONG", this.long.issuance.volume_open_interest, ds) &&
            ds.marketState.open_interest.state >= this.long.issuance.volume_open_interest.open_interest
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.volume_open_interest.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.volume_open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.volume_open_interest, ds) &&
            this.isVolumeCompliying("SHORT", this.short.issuance.volume_open_interest, ds) &&
            ds.marketState.open_interest.state <= this.short.issuance.volume_open_interest.open_interest
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
    }








    /**
     * Evaluates the trend state & intensity as well as the current
     * volume and long/short ratio  states.
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeLongShortRatioIssuance(ds: ISignalDataset): IPredictionResult {
        // Evaluate if a long signal should be issued
        if (
            this.long.issuance.volume_long_short_ratio.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.volume_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.volume_long_short_ratio, ds) &&
            this.isVolumeCompliying("LONG", this.long.issuance.volume_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.volume_long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.volume_long_short_ratio.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.volume_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.volume_long_short_ratio, ds) &&
            this.isVolumeCompliying("SHORT", this.short.issuance.volume_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state <= this.short.issuance.volume_long_short_ratio.long_short_ratio
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
            this.long.issuance.technicals_open_interest.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals_open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.technicals_open_interest, ds) &&
            this.isTACompliying("LONG", this.long.issuance.technicals_open_interest, ds) &&
            ds.marketState.open_interest.state >= this.long.issuance.technicals_open_interest.open_interest
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.technicals_open_interest.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals_open_interest.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.technicals_open_interest, ds) &&
            this.isTACompliying("SHORT", this.short.issuance.technicals_open_interest, ds) &&
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
            this.long.issuance.technicals_long_short_ratio.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.technicals_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.technicals_long_short_ratio, ds) &&
            this.isTACompliying("LONG", this.long.issuance.technicals_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.technicals_long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.technicals_long_short_ratio.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.technicals_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.technicals_long_short_ratio, ds) &&
            this.isTACompliying("SHORT", this.short.issuance.technicals_long_short_ratio, ds) &&
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
            this.long.issuance.open_interest_long_short_ratio.enabled &&
            this.isTrendSumCompliying("LONG", this.long.issuance.open_interest_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("LONG", this.long.issuance.open_interest_long_short_ratio, ds) &&
            ds.marketState.open_interest.state >= this.long.issuance.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state >= this.long.issuance.open_interest_long_short_ratio.long_short_ratio
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            this.short.issuance.open_interest_long_short_ratio.enabled &&
            this.isTrendSumCompliying("SHORT", this.short.issuance.open_interest_long_short_ratio.trend_sum, ds.trendSum) &&
            this.isTrendStateCompliying("SHORT", this.short.issuance.open_interest_long_short_ratio, ds) &&
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
        policyTrendSum: ITrendSumState,
        currentTrendSum: number
    ): boolean {
        // Evaluate a long policy
        if (side == "LONG" && policyTrendSum != 0)       { return currentTrendSum > 0 }

        // Evaluate a short policy
        else if (side == "SHORT" && policyTrendSum != 0) { return currentTrendSum < 0 }

        // Otherwise, the trend sum is compliying as it is not required
        else { return true }
    }





    /**
     * Verifies if the current trend state & intensity are complying with the policy.
     * @param side 
     * @param policy
     * @param ds 
     * @returns boolean
     */
    private isTrendStateCompliying(side: IBinancePositionSide, policy: IIssuancePolicy, ds: ISignalDataset): boolean {
        // Evaluate a long policy
        if (side == "LONG") { 
            return  policy.trend_state == 0 || policy.trend_intensity == 0 || 
                    (ds.trendState >= policy.trend_state && ds.trendStateIntensity >= policy.trend_intensity);
        }

        // Evaluate a short policy
        else { 
            return  policy.trend_state == 0 || policy.trend_intensity == 0 ||
                    (ds.trendState <= policy.trend_state && ds.trendStateIntensity <= policy.trend_intensity);
        }
    }




    /**
     * Verifies if the current volume state and direction are complying with the policy.
     * @param side 
     * @param policy
     * @param ds 
     * @returns boolean
     */
    private isVolumeCompliying(side: IBinancePositionSide, policy: IVolumeBasedIssuancePolicy, ds: ISignalDataset): boolean {
        // Evaluate a long policy
        if (side == "LONG") { 
            return  policy.volume == 0 || policy.volume_direction == 0 || 
                    (ds.marketState.volume.state >= policy.volume && ds.marketState.volume.direction >= policy.volume_direction);
        }

        // Evaluate a short policy
        else { 
            return  policy.volume == 0 || policy.volume_direction == 0 ||
                    (ds.marketState.volume.state >= policy.volume && ds.marketState.volume.direction <= policy.volume_direction);
        }
    }




    /**
     * Verifies if the current TA state is compliying with the policy.
     * @param side 
     * @param policy 
     * @param ds 
     * @returns boolean
     */
    private isTACompliying(side: IBinancePositionSide, policy: ITechnicalsBasedIssuancePolicy, ds: ISignalDataset): boolean {
        // Evaluate a long policy
        if (side == "LONG") { 
            return  (policy.ta_30m == 0 || ds.marketState.technical_analysis["30m"].s.a >= policy.ta_30m) &&
                    (policy.ta_1h == 0 || ds.marketState.technical_analysis["1h"].s.a >= policy.ta_1h) &&
                    (policy.ta_2h == 0 || ds.marketState.technical_analysis["2h"].s.a >= policy.ta_2h) &&
                    (policy.ta_4h == 0 || ds.marketState.technical_analysis["4h"].s.a >= policy.ta_4h) &&
                    (policy.ta_1d == 0 || ds.marketState.technical_analysis["1d"].s.a >= policy.ta_1d);
        }

        // Evaluate a short policy
        else { 
            return  (policy.ta_30m == 0 || ds.marketState.technical_analysis["30m"].s.a <= policy.ta_30m) &&
                    (policy.ta_1h == 0 || ds.marketState.technical_analysis["1h"].s.a <= policy.ta_1h) &&
                    (policy.ta_2h == 0 || ds.marketState.technical_analysis["2h"].s.a <= policy.ta_2h) &&
                    (policy.ta_4h == 0 || ds.marketState.technical_analysis["4h"].s.a <= policy.ta_4h) &&
                    (policy.ta_1d == 0 || ds.marketState.technical_analysis["1d"].s.a <= policy.ta_1d);
        }
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
        if (
            current == 1 && 
            this.long.cancellation.window.enabled &&
            ds.marketState.window.state >= this.long.cancellation.window.window
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.window.enabled &&
            ds.marketState.window.state <= this.short.cancellation.window.window
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the volume state & direction.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.volume.enabled &&
            this.isVolumeCancelling("LONG", this.long.cancellation.volume, ds)
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.volume.enabled &&
            this.isVolumeCancelling("SHORT", this.short.cancellation.volume, ds)
        ){
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
            this.long.cancellation.technicals.enabled &&
            this.isTACancelling("LONG", this.long.cancellation.technicals, ds)
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.technicals.enabled &&
            this.isTACancelling("SHORT", this.short.cancellation.technicals, ds)
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the open interest state.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateOpenInterestCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.open_interest.enabled &&
            ds.marketState.open_interest.state <= this.long.cancellation.open_interest.open_interest
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.open_interest.enabled &&
            ds.marketState.open_interest.state >= this.short.cancellation.open_interest.open_interest
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }






    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the long/short ratio state.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateLongShortRatioCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.long_short_ratio.enabled &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.long_short_ratio.enabled &&
            ds.marketState.long_short_ratio.state >= this.short.cancellation.long_short_ratio.long_short_ratio
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the volume state & direction and technical analysis state.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeTechnicalsCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.volume_technicals.enabled &&
            this.isVolumeCancelling("LONG", this.long.cancellation.volume_technicals, ds) &&
            this.isTACancelling("LONG", this.long.cancellation.volume_technicals, ds)
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.volume_technicals.enabled &&
            this.isVolumeCancelling("SHORT", this.short.cancellation.volume_technicals, ds) &&
            this.isTACancelling("SHORT", this.short.cancellation.volume_technicals, ds)
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the volume and open interest states.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeOpenInterestCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.volume_open_interest.enabled &&
            this.isVolumeCancelling("LONG", this.long.cancellation.volume_open_interest, ds) &&
            ds.marketState.open_interest.state <= this.long.cancellation.volume_open_interest.open_interest
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.volume_open_interest.enabled &&
            this.isVolumeCancelling("SHORT", this.short.cancellation.volume_open_interest, ds) &&
            ds.marketState.open_interest.state >= this.short.cancellation.volume_open_interest.open_interest
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /**
     * Evaluates if a non-neutral signal should be cancelled based
     * on the volume and long short ratio states.
     * @param current 
     * @param ds 
     * @returns IPredictionResult
     */
    private evaluateVolumeLongShortRatioCancellation(current: IPredictionResult, ds: ISignalDataset): IPredictionResult {
        // Evaluate a long signal
        if (
            current == 1 && 
            this.long.cancellation.volume_long_short_ratio.enabled &&
            this.isVolumeCancelling("LONG", this.long.cancellation.volume_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.volume_long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.volume_long_short_ratio.enabled &&
            this.isVolumeCancelling("SHORT", this.short.cancellation.volume_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state >= this.short.cancellation.volume_long_short_ratio.long_short_ratio
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
            this.long.cancellation.technicals_open_interest.enabled &&
            this.isTACancelling("LONG", this.long.cancellation.technicals_open_interest, ds) &&
            ds.marketState.open_interest.state <= this.long.cancellation.technicals_open_interest.open_interest
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.technicals_open_interest.enabled &&
            this.isTACancelling("SHORT", this.short.cancellation.technicals_open_interest, ds) &&
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
            this.long.cancellation.technicals_long_short_ratio.enabled &&
            this.isTACancelling("LONG", this.long.cancellation.technicals_long_short_ratio, ds) &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.technicals_long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.technicals_long_short_ratio.enabled &&
            this.isTACancelling("SHORT", this.short.cancellation.technicals_long_short_ratio, ds) &&
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
            this.long.cancellation.open_interest_long_short_ratio.enabled &&
            ds.marketState.open_interest.state <= this.long.cancellation.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state <= this.long.cancellation.open_interest_long_short_ratio.long_short_ratio
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            this.short.cancellation.open_interest_long_short_ratio.enabled &&
            ds.marketState.open_interest.state >= this.short.cancellation.open_interest_long_short_ratio.open_interest &&
            ds.marketState.long_short_ratio.state >= this.short.cancellation.open_interest_long_short_ratio.long_short_ratio
        ){
            return 0;
        }

        // Otherwise, maintain the signal active
        else { return current }
    }







    /* Cancellation Policy Helpers */





   /**
     * Verifies if the current volume state and direction are cancelling a signal based on the policy.
     * @param side 
     * @param policy 
     * @param ds 
     * @returns boolean
     */
   private isVolumeCancelling(side: IBinancePositionSide, policy: IVolumeBasedCancellationPolicy, ds: ISignalDataset): boolean {
    // Evaluate a long policy
    if (side == "LONG") { 
        return policy.volume == 0 || policy.volume_direction == 0 ||
            (ds.marketState.volume.state >= policy.volume && ds.marketState.volume.direction <= policy.volume_direction);
    }

    // Evaluate a short policy
    else { 
        return policy.volume == 0 || policy.volume_direction == 0 ||
            (ds.marketState.volume.state >= policy.volume && ds.marketState.volume.direction >= policy.volume_direction);
    }
}




   /**
     * Verifies if the current TA state is cancelling a signal based on the policy.
     * @param side 
     * @param policy 
     * @param ds 
     * @returns boolean
     */
   private isTACancelling(side: IBinancePositionSide, policy: ITechnicalsBasedCancellationPolicy, ds: ISignalDataset): boolean {
        // Evaluate a long policy
        if (side == "LONG") { 
            return  (policy.ta_30m == 0 || ds.marketState.technical_analysis["30m"].s.a <= policy.ta_30m) &&
                    (policy.ta_1h == 0 || ds.marketState.technical_analysis["1h"].s.a <= policy.ta_1h) &&
                    (policy.ta_2h == 0 || ds.marketState.technical_analysis["2h"].s.a <= policy.ta_2h) &&
                    (policy.ta_4h == 0 || ds.marketState.technical_analysis["4h"].s.a <= policy.ta_4h) &&
                    (policy.ta_1d == 0 || ds.marketState.technical_analysis["1d"].s.a <= policy.ta_1d);
        }

        // Evaluate a short policy
        else { 
            return  (policy.ta_30m == 0 || ds.marketState.technical_analysis["30m"].s.a >= policy.ta_30m) &&
                    (policy.ta_1h == 0 || ds.marketState.technical_analysis["1h"].s.a >= policy.ta_1h) &&
                    (policy.ta_2h == 0 || ds.marketState.technical_analysis["2h"].s.a >= policy.ta_2h) &&
                    (policy.ta_4h == 0 || ds.marketState.technical_analysis["4h"].s.a >= policy.ta_4h) &&
                    (policy.ta_1d == 0 || ds.marketState.technical_analysis["1d"].s.a >= policy.ta_1d);
        }
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



















    /******************************
     * Signal Policies Management *
     ******************************/




    /**
     * Initializes the signal policies for both sides. In case they haven't
     * been created, it sets the default policies.
     */
    private async initializePolicies(): Promise<void> {
        // Retrieve the policies stored in the db
        const policies: ISignalPolicies|undefined = await this._model.getPolicies();

        // If they have been set, unpack them into the local properties
        if (policies) {
            this.long = policies.long;
            this.short = policies.short;
        }

        // Otherwise, set the default policies and save them
        else {
            this.long = this.buildDefaultLongPolicies();
            this.short = this.buildDefaultShortPolicies();
            await this._model.createPolicies({ long: this.long, short: this.short });
        }
    }







    /**
     * Retrieves the issuance and cancellation policies for a side.
     * @param side 
     * @returns ISignalSidePolicies
     */
    public getPolicies(side: IBinancePositionSide): ISignalSidePolicies {
        // Validate the request
        this._validations.validateSide(side);

        // Return the policies accordingly
        return side == "LONG" ? this.long: this.short;
    }







    /**
     * Validates and updates the signal policies for a given side.
     * @param side 
     * @param newPolicies 
     * @returns Promise<void>
     */
    public async updatePolicies(side: IBinancePositionSide, newPolicies: ISignalSidePolicies): Promise<void> {
        // Validate the request
        this._validations.canSidePoliciesBeUpdated(side, newPolicies);

        // Set the new policies on the local property
        if (side == "LONG") { this.long = newPolicies } 
        else                { this.short = newPolicies }

        // Finally, update the policies on the db
        await this._model.updatePolicies({ long: this.long, short: this.short });
    }








    /* Default Policies */




    /**
     * Builds the default long signal policies.
     * @returns ISignalSidePolicies
     */
    private buildDefaultLongPolicies(): ISignalSidePolicies {
        return {
            // Issuance
            issuance: {
                volume: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 5,
                    trend_intensity: 2,
                    volume: 2,
                    volume_direction: 2
                },
                technicals: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 5,
                    trend_intensity: 2,
                    ta_30m: 2,
                    ta_1h: 2,
                    ta_2h: 2,
                    ta_4h: 2,
                    ta_1d: 2,
                },
                open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 5,
                    trend_intensity: 2,
                    open_interest: 2
                },
                long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 5,
                    trend_intensity: 2,
                    long_short_ratio: 2
                },
                volume_technicals: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    volume: 1,
                    volume_direction: 2,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                },
                volume_open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    volume: 1,
                    volume_direction: 2,
                    open_interest: 1,
                },
                volume_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    volume: 1,
                    volume_direction: 2,
                    long_short_ratio: 1,
                },
                technicals_open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                    open_interest: 1,
                },
                technicals_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                    long_short_ratio: 1,
                },
                open_interest_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: 3,
                    trend_intensity: 1,
                    open_interest: 1,
                    long_short_ratio: 1,
                }
            },
    
            // Cancellation
            cancellation: {
                window: {
                    enabled: true,
                    window: 2
                },
                volume: {
                    enabled: true,
                    volume: 2,
                    volume_direction: -2,
                },
                technicals: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: -2,
                    ta_2h: -2,
                    ta_4h: -2,
                    ta_1d: -2,
                },
                open_interest: {
                    enabled: true,
                    open_interest: -2
                },
                long_short_ratio: {
                    enabled: true,
                    long_short_ratio: -2
                },
                volume_technicals: {
                    enabled: true,
                    volume: 1,
                    volume_direction: -2,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                },
                volume_open_interest: {
                    enabled: true,
                    volume: 1,
                    volume_direction: -2,
                    open_interest: -1,
                },
                volume_long_short_ratio: {
                    enabled: true,
                    volume: 1,
                    volume_direction: -2,
                    long_short_ratio: -1,
                },
                technicals_open_interest: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                    open_interest: -1,
                },
                technicals_long_short_ratio: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                    long_short_ratio: -1,
                },
                open_interest_long_short_ratio: {
                    enabled: true,
                    open_interest: -1,
                    long_short_ratio: -1,
                }
            }
        }
    }






    /**
     * Builds the default short signal policies.
     * @returns ISignalSidePolicies
     */
    private buildDefaultShortPolicies(): ISignalSidePolicies {
        return {
            // Issuance
            issuance: {
                volume: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -5,
                    trend_intensity: -2,
                    volume: 2,
                    volume_direction: -2
                },
                technicals: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -5,
                    trend_intensity: -2,
                    ta_30m: -2,
                    ta_1h: -2,
                    ta_2h: -2,
                    ta_4h: -2,
                    ta_1d: -2,
                },
                open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -5,
                    trend_intensity: -2,
                    open_interest: -2
                },
                long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -5,
                    trend_intensity: -2,
                    long_short_ratio: -2
                },
                volume_technicals: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    volume: 1,
                    volume_direction: -2,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                },
                volume_open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    volume: 1,
                    volume_direction: -2,
                    open_interest: -1,
                },
                volume_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    volume: 1,
                    volume_direction: -2,
                    long_short_ratio: -1,
                },
                technicals_open_interest: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                    open_interest: -1
                },
                technicals_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: -1,
                    ta_4h: -1,
                    ta_1d: -1,
                    long_short_ratio: -1
                },
                open_interest_long_short_ratio: {
                    enabled: true,
                    trend_sum: 0,
                    trend_state: -3,
                    trend_intensity: -1,
                    open_interest: -1,
                    long_short_ratio: -1
                }
            },
    
            // Cancellation
            cancellation: {
                window: {
                    enabled: true,
                    window: -2
                },
                volume: {
                    enabled: true,
                    volume: 2,
                    volume_direction: 2
                },
                technicals: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: 2,
                    ta_2h: 2,
                    ta_4h: 2,
                    ta_1d: 2,
                },
                open_interest: {
                    enabled: true,
                    open_interest: 2
                },
                long_short_ratio: {
                    enabled: true,
                    long_short_ratio: 2
                },
                volume_technicals: {
                    enabled: true,
                    volume: 1,
                    volume_direction: 2,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                },
                volume_open_interest: {
                    enabled: true,
                    volume: 1,
                    volume_direction: 2,
                    open_interest: 1,
                },
                volume_long_short_ratio: {
                    enabled: true,
                    volume: 1,
                    volume_direction: 2,
                    long_short_ratio: 1,
                },
                technicals_open_interest: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                    open_interest: 1
                },
                technicals_long_short_ratio: {
                    enabled: true,
                    ta_30m: 0,
                    ta_1h: 0,
                    ta_2h: 1,
                    ta_4h: 1,
                    ta_1d: 1,
                    long_short_ratio: 1
                },
                open_interest_long_short_ratio: {
                    enabled: true,
                    open_interest: 1,
                    long_short_ratio: 1
                }
            }
        }
    }
}
