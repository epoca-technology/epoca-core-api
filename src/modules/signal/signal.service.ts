import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IPrediction, IPredictionResult } from "../epoch-builder";
import { IMarketState, IMarketStateService } from "../market-state";
import { IPredictionService } from "../prediction";
import { IUtilitiesService } from "../utilities";
import { 
    IPredictionCancellationPolicies, 
    IPredictionCancellationPolicy, 
    IPredictionCancellationPolicyItemState, 
    ISignalService 
} from "./interfaces";


@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)           private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)          private _marketState: IMarketStateService;
    @inject(SYMBOLS.DatabaseService)             private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;


    /**
     * Active Signal
     * When the Prediction Model generates a non-neutral prediction,
     * it is evaluated against the cancellation policy. 
     * The final result is broadcasted through this observable.
     */
    public active: BehaviorSubject<IPredictionResult> = new BehaviorSubject(0);


    /**
     * Cancellation Policies
     * The object containing all the policies that will be considered
     * whenever a non-neutral prediction is issued
     */
    public policies: IPredictionCancellationPolicies;



    /**
     * Prediction Subscription
     * The connection to the prediction stream. Whenever a new prediction
     * becomes available, it will be evaluated and broadcasted.
     */
    private predictionSub?: Subscription;


    /**
     * Policy Item States
     * Each policy item can have its own state which will be used when
     * evaluating a non-neutral prediction.
     */
    private readonly states: IPredictionCancellationPolicyItemState[] = [
        "IGNORE", "STRONG_BUY", "STRONG_SELL", "INCREASING", "DECREASING"
    ];


    constructor() {}






    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the signal configurations as well as the
     * connection with the prediction, market state and any
     * other required module..
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the cancellation policies
        await this.initializePolicies();

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








    /***********************************
     * New Prediction Event Management *
     ***********************************/





    /**
     * Whenever a new prediction becomes available, it is 
     * evaluated and neutralized in case policy is met.
     * @param pred 
     */
    private onNewPrediction(pred: IPrediction): void {
        // Initialize the prediction
        let result: IPredictionResult = pred.r;

        // If it is a long, evaluate if it should be neutralized
        if (result == 1) { result = this.evaluatePolicy(result, this.policies.LONG) }

        // If it is a short, evaluate if it should be neutralized
        else if (result == -1) { result = this.evaluatePolicy(result, this.policies.SHORT) }

        // Finally, broadcast it
        this.active.next(result);
    }





    /**
     * Based on a given non-neutral prediction and a policy,
     * it will evaluate if the prediction should be neutralized.
     * @param currentPrediction 
     * @param policy 
     * @returns IPredictionResult
     */
    private evaluatePolicy(
        currentPrediction: IPredictionResult, 
        policy: IPredictionCancellationPolicy
    ): IPredictionResult {
        // Initialize the market state
        const ms: IMarketState = this._marketState.active.value;

        // Init the counters
        let evaluatedItems: number = 0;
        let proNeutralizeItems: number = 0;

        // Evaluate technical analysis
        if (policy.ta_30m != "IGNORE") {
            evaluatedItems += 1;
            if (policy.ta_30m == ms.technical_analysis["30m"].s.a) proNeutralizeItems += 1;
        }
        if (policy.ta_2h != "IGNORE") {
            evaluatedItems += 1;
            if (policy.ta_2h == ms.technical_analysis["2h"].s.a) proNeutralizeItems += 1;
        }
        if (policy.ta_4h != "IGNORE") {
            evaluatedItems += 1;
            if (policy.ta_4h == ms.technical_analysis["4h"].s.a) proNeutralizeItems += 1;
        }
        if (policy.ta_1d != "IGNORE") {
            evaluatedItems += 1;
            if (policy.ta_1d == ms.technical_analysis["1d"].s.a) proNeutralizeItems += 1;
        }

        // Evaluate market state
        if (policy.window != "IGNORE") {
            evaluatedItems += 1;
            if (policy.window == ms.window.state.toUpperCase()) proNeutralizeItems += 1;
        }
        if (policy.volume != "IGNORE") {
            evaluatedItems += 1;
            if (policy.volume == ms.volume.state.toUpperCase()) proNeutralizeItems += 1;
        }
        if (policy.network_fee != "IGNORE") {
            evaluatedItems += 1;
            if (policy.network_fee == ms.network_fee.state.toUpperCase()) proNeutralizeItems += 1;
        }
        if (policy.open_interest != "IGNORE") {
            evaluatedItems += 1;
            if (policy.open_interest == ms.open_interest.state.toUpperCase()) proNeutralizeItems += 1;
        }
        if (policy.long_short_ratio != "IGNORE") {
            evaluatedItems += 1;
            if (policy.long_short_ratio == ms.long_short_ratio.state.toUpperCase()) proNeutralizeItems += 1;
        }

        // Finally, check if the decision was unanimous
        return evaluatedItems > 0 && evaluatedItems == proNeutralizeItems ? 0: currentPrediction;
    }












    /***********************************************
     * Prediction Cancellation Policies Management *
     ***********************************************/




    /**
     * Initializes the current cancellation policies. If they haven't
     * been set, it sets the default build.
     */
    private async initializePolicies(): Promise<void> {
        this.policies = await this.getPolicies();
        if (!this.policies) {
            this.policies = this.buildDefaultPolicies();
            await this.createPolicies();
        }
    }





    /**
     * Retrieves current cancellation policies. If none has been set,
     * it returns undefined
     * @returns Promise<IPredictionCancellationPolicies|undefined>
     */
    private async getPolicies(): Promise<IPredictionCancellationPolicies|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT policies FROM  ${this._db.tn.prediction_cancellation_policies} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].policies: undefined;
    }





    /**
     * Stores the default policies.
     * @returns Promise<void>
     */
    private async createPolicies(): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.prediction_cancellation_policies}(id, policies) VALUES(1, $1)`,
            values: [this.policies]
        });
    }






    /**
     * Updates the current policies.
     * @returns Promise<void>
     */
    public async updatePolicies(newPolicies: IPredictionCancellationPolicies): Promise<void> {
        // Validate the new policies
        this.validateNewPolicies(newPolicies);

        // Update it on the db and the local property
        await this._db.query({
            text: `UPDATE ${this._db.tn.prediction_cancellation_policies} SET policies=$1 WHERE id=1`,
            values: [newPolicies]
        });
        this.policies = newPolicies;
    }




    /**
     * Given a new policies object, it will make sure the data was provided
     * in a valid format.
     * @param newPolicies 
     */
    private validateNewPolicies(newPolicies: IPredictionCancellationPolicies): void {
        // Make sure the policies have been properly provided
        if (
            !newPolicies ||
            typeof newPolicies != "object" ||
            !newPolicies.LONG ||
            typeof newPolicies.LONG != "object" ||
            !newPolicies.SHORT ||
            typeof newPolicies.SHORT != "object"
        ) {
            console.log(newPolicies);
            throw new Error(this._utils.buildApiError(`The provided cancellation policies are invalid.`, 35000));
        }

        // Validate each policy
        this.validatePolicy(newPolicies.LONG);
        this.validatePolicy(newPolicies.SHORT);
    }



    /**
     * Validates the cancellation policy of a side.
     * @param newPolicy 
     */
    private validatePolicy(newPolicy: IPredictionCancellationPolicy): void {
        // Validate the technical analysis items
        this.validatePolicyItemState("ta_30m", newPolicy.ta_30m);
        this.validatePolicyItemState("ta_2h", newPolicy.ta_2h);
        this.validatePolicyItemState("ta_4h", newPolicy.ta_4h);
        this.validatePolicyItemState("ta_1d", newPolicy.ta_1d);

        // Validate the market state items
        this.validatePolicyItemState("window", newPolicy.window);
        this.validatePolicyItemState("volume", newPolicy.volume);
        this.validatePolicyItemState("network_fee", newPolicy.network_fee);
        this.validatePolicyItemState("open_interest", newPolicy.open_interest);
        this.validatePolicyItemState("long_short_ratio", newPolicy.long_short_ratio);
    }



    /**
     * Validates an individual item by the provided state.
     * @param itemName 
     * @param itemState 
     */
    private validatePolicyItemState(itemName: string, itemState: IPredictionCancellationPolicyItemState): void {
        if (typeof itemState != "string" || !this.states.includes(itemState)) {
            throw new Error(this._utils.buildApiError(`The provided state for ${itemName} is invalid. Received: ${itemState}`, 35001));
        }
    }









    /* Default Build */


    /**
     * Builds the default policies object for both sides.
     * @returns IPredictionCancellationPolicies
     */
    private buildDefaultPolicies(): IPredictionCancellationPolicies {
        return { LONG: this.buildDefaultPolicy(), SHORT: this.buildDefaultPolicy() }
    }




    /**
     * Builds the default cancellation policy object.
     * @returns IPredictionCancellationPolicy
     */
    private buildDefaultPolicy(): IPredictionCancellationPolicy {
        return {
            ta_30m: "IGNORE",
            ta_2h: "IGNORE",
            ta_4h: "IGNORE",
            ta_1d: "IGNORE",
            window: "IGNORE",
            volume: "IGNORE",
            network_fee: "IGNORE",
            open_interest: "IGNORE",
            long_short_ratio: "IGNORE",
        }
    }
}
