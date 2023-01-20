import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IMarketStateService } from "../market-state";
import { IPredictionService } from "../prediction";
import { 
    ISignalService,
    ISignalDataset
} from "./interfaces";


@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)           private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)          private _marketState: IMarketStateService;


    /**
     * Active Signal
     * When the Prediction Model generates a new prediction, it is
     * evaluated against the issuance and cancellation policies. The
     * result is broadcasted through this observable.
     */
    private predictionSub?: Subscription;
    public active: BehaviorSubject<IPredictionResult> = new BehaviorSubject(0);





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
            ds.trendState >= 3 &&
            ds.trendStateIntensity >= 2 &&
            ds.marketState.technical_analysis["30m"].s.a >= 1 &&
            ds.marketState.technical_analysis["1h"].s.a >= 1 &&
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            ds.trendState <= -3 &&
            ds.trendStateIntensity <= -2 &&
            ds.marketState.technical_analysis["30m"].s.a <= -1 &&
            ds.marketState.technical_analysis["1h"].s.a <= -1 &&
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1
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
            ds.trendState >= 3 &&
            ds.trendStateIntensity >= 2 &&
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1 &&
            ds.marketState.open_interest.state >= 1
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            ds.trendState <= -3 &&
            ds.trendStateIntensity <= -2 &&
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1 &&
            ds.marketState.open_interest.state <= -1
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
            ds.trendState >= 3 &&
            ds.trendStateIntensity >= 2 &&
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1 &&
            ds.marketState.long_short_ratio.state >= 1
        ) {
            return 1;
        }

        // Evaluate if a short signal should be issued
        else if (
            ds.trendState <= -3 &&
            ds.trendStateIntensity <= -2 &&
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1 &&
            ds.marketState.long_short_ratio.state <= -1
        ) {
            return -1;
        }

        // Otherwise, stand neutral
        else { return 0 }
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
        if (current == 1 && ds.marketState.window.state >= 2) {
            return 0;
        }

        // Evaluate a short signal
        else if (current == -1 && ds.marketState.window.state <= -2){
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
            ds.marketState.technical_analysis["30m"].s.a <= -1 &&
            ds.marketState.technical_analysis["1h"].s.a <= -1 &&
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["30m"].s.a >= 1 &&
            ds.marketState.technical_analysis["1h"].s.a >= 1 &&
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1
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
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1 &&
            ds.marketState.open_interest.state <= -1
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1 &&
            ds.marketState.open_interest.state >= 1
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
            ds.marketState.technical_analysis["2h"].s.a <= -1 &&
            ds.marketState.technical_analysis["4h"].s.a <= -1 &&
            ds.marketState.technical_analysis["1d"].s.a <= -1 &&
            ds.marketState.long_short_ratio.state <= -1
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.technical_analysis["2h"].s.a >= 1 &&
            ds.marketState.technical_analysis["4h"].s.a >= 1 &&
            ds.marketState.technical_analysis["1d"].s.a >= 1 &&
            ds.marketState.long_short_ratio.state >= 1
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
            ds.marketState.open_interest.state <= -1 &&
            ds.marketState.long_short_ratio.state <= -1
        ) {
            return 0;
        }

        // Evaluate a short signal
        else if (
            current == -1 && 
            ds.marketState.open_interest.state >= 1 &&
            ds.marketState.long_short_ratio.state >= 1
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
            trendState: this._prediction.activeState,
            trendStateIntensity: this._prediction.activeStateIntesity,
            marketState: this._marketState.active.value
        }
    }
}
