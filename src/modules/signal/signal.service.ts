import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { 
    IKeyZoneStateEventKind, 
    IMarketState, 
    IMarketStateService, 
    IStateType 
} from "../market-state";
import { IPredictionService } from "../prediction";
import { IUtilitiesService } from "../utilities";
import { 
    ISignalService,
    ISignalValidations,
    ISignalModel,
    ISignalPolicies,
    ISignalRecord,
    ISignalDataset
} from "./interfaces";




@injectable()
export class SignalService implements ISignalService {
    // Inject dependencies
    @inject(SYMBOLS.SignalValidations)          private _validations: ISignalValidations;
    @inject(SYMBOLS.SignalModel)                private _model: ISignalModel;
    @inject(SYMBOLS.PredictionService)          private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)         private _marketState: IMarketStateService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    /**
     * Signal Policies
     * There are policies for both position sides split into "Issuance" 
     * and "Cancellation". It only takes 1 cancellation policy to trigger
     * in order to cancel an entire signal.
     */
    public policies: ISignalPolicies;



    /**
     * Active Signal
     * The active signal record which is evaluated whenever the market state
     * broadcasts a new event. If there is no active signal, this value will
     * be null.
     */
    public active: BehaviorSubject<ISignalRecord|null> = new BehaviorSubject(null);
    private msSub: Subscription;


    /**
     * Last Reversal ID
     * The reversal module maintains the state until the KeyZone Event fades away.
     * Therefore, the signal module must ensure that the signal is only emitted 
     * once.
     */
    private lastReversalID: number|undefined;




    constructor() {}














    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the position module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the policies
        await this.initializePolicies();

        // Initialize the subscription to the market state
        this.msSub = this._marketState.active.subscribe(async (ms: IMarketState) => {
            try {
                await this.onNewMarketState(ms);
            } catch (e) {
                console.log(e);
                this._apiError.log("SignalService.interval.onNewMarketState", e);
            }
        });
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.msSub) this.msSub.unsubscribe();
    }















    /******************************
     * Market State Change Events *
     ******************************/









    /**
     * Triggers whenever the market state changes. Looks for active
     * signals and manages the broadcasting and storing (if any).
     * @param marketState 
     * @returns Promise<void>
     */
    private async onNewMarketState(marketState: IMarketState): Promise<void> {
        // Initialize the record
        let record: ISignalRecord|null = null;

        // Build the dataset
        const ds: ISignalDataset = this.makeSignalDataset(marketState);

        // Check if there is a potential signal
        if (
            ds.keyzoneStateEvent &&
            (ds.keyzoneStateEvent.k == "s" || ds.keyzoneStateEvent.k == "r") &&
            (ds.reversalState.e && ds.reversalState.id != this.lastReversalID) &&
            !this.isWindowStateCancelling(ds.keyzoneStateEvent.k, ds.windowState) &&
            !this.isTrendSumCancelling(ds.keyzoneStateEvent.k, ds.trendSum) &&
            !this.isTrendStateCancelling(ds.keyzoneStateEvent.k, ds.trendState)
        ) {
            // Build the signal record
            record = {
                t: Date.now(),
                r: ds.keyzoneStateEvent.k == "s" ? 1: -1,
                s: ds.reversalState.e.s
            };

            // Save the ID of the reversal temporarily
            this.lastReversalID = ds.reversalState.id;
        }

        // Broadcast the signal
        this.active.next(record);

        // If a signal was built, store it
        if (record) await this._model.saveRecord(record);
    }





    



    /* Issuance Policies */

















    /* Cancellation Policies */





    /**
     * Evaluates if the window state policy is currently cancelling
     * the KeyZone Event Kind.
     * @param kind 
     * @param currentState 
     * @returns boolean
     */
    private isWindowStateCancelling(kind: IKeyZoneStateEventKind, currentState: IStateType): boolean {
        // Evaluate if a long should be cancelled
        if (
            kind == "s" &&
            this.policies.long.cancellation.window_state.enabled &&
            currentState <= this.policies.long.cancellation.window_state.window_state
        ) {
            return true;
        }

        // Evaluate if a short should be cancelled
        else if (
            kind == "r" &&
            this.policies.short.cancellation.window_state.enabled &&
            currentState >= this.policies.short.cancellation.window_state.window_state
        ) {
            return true;
        }

        // Otherwise, the window state policy is not cancelling
        else { return false }
    }

    



    /**
     * Evaluates if the trend sum policy is currently cancelling
     * the KeyZone Event Kind.
     * @param kind 
     * @param trendSum 
     * @returns boolean
     */
    private isTrendSumCancelling(kind: IKeyZoneStateEventKind, trendSum: number): boolean {
        // Evaluate if a long should be cancelled
        if (
            kind == "s" &&
            this.policies.long.cancellation.trend_sum.enabled &&
            trendSum <= this.policies.long.cancellation.trend_sum.trend_sum
        ) {
            return true;
        }

        // Evaluate if a short should be cancelled
        else if (
            kind == "r" &&
            this.policies.short.cancellation.trend_sum.enabled &&
            trendSum >= this.policies.short.cancellation.trend_sum.trend_sum
        ) {
            return true;
        }

        // Otherwise, the trend state policy is not cancelling
        else { return false }
    }








    /**
     * Evaluates if the trend state policy is currently cancelling
     * the KeyZone Event Kind.
     * @param kind 
     * @param trendState 
     * @returns boolean
     */
    private isTrendStateCancelling(kind: IKeyZoneStateEventKind, trendState: IStateType): boolean {
        // Evaluate if a long should be cancelled
        if (
            kind == "s" &&
            this.policies.long.cancellation.trend_state.enabled &&
            trendState <= this.policies.long.cancellation.trend_state.trend_state
        ) {
            return true;
        }

        // Evaluate if a short should be cancelled
        else if (
            kind == "r" &&
            this.policies.short.cancellation.trend_state.enabled &&
            trendState >= this.policies.short.cancellation.trend_state.trend_state
        ) {
            return true;
        }

        // Otherwise, the trend state policy is not cancelling
        else { return false }
    }














    /* Dataset Builder */



    /**
     * Builds the signal dataset in order to review the policies.
     * @param ms 
     * @returns ISignalDataset
     */
    private makeSignalDataset(ms: IMarketState): ISignalDataset {
        // Set the current trend sum
        let trendSum: number = 0;
        if (this._prediction.active.value) trendSum = this._prediction.active.value.s;

        // Finally, return the ds
        return {
            trendSum: trendSum,
            trendState: ms.trend.s,
            windowState: ms.window.s,
            keyzoneStateEvent: ms.keyzones.event ? ms.keyzones.event: undefined,
            reversalState: ms.reversal
        }
    }
























    /******************************
     * Signal Policies Management *
     ******************************/




    /**
     * Initializes the signal policies. In case they haven't
     * been created, it sets the default policies.
     */
    private async initializePolicies(): Promise<void> {
        // Retrieve the policies stored in the db
        const policies: ISignalPolicies|undefined = await this._model.getPolicies();

        // If they have been set, unpack them into the local property
        if (policies) {
            this.policies = policies;
        }

        // Otherwise, set the default policies and save them
        else {
            this.policies = this.buildDefaultPolicies();
            await this._model.createPolicies(this.policies);
        }
    }






    /**
     * Updates the active signal policies. Changes
     * take effect right away.
     * @param newPolicies 
     * @returns Promise<void>
     */
    public async updatePolicies(newPolicies: ISignalPolicies): Promise<void> {
        // Validate the request
        this._validations.canPoliciesBeUpdated(newPolicies);

        // Store the new policies in the db and update the local property
        await this._model.updatePolicies(newPolicies);
        this.policies = newPolicies;
    }










    /**
     * Builds the default signal policies object in order
     * for the module to be initialized.
     * @returns 
     */
    private buildDefaultPolicies() : ISignalPolicies {
        return {
            long: {
                issuance: {
                    keyzone_reversal: {
                        enabled: true, // Cannot be disabled
                    }
                },
                cancellation: {
                    window_state: {
                        enabled: true,
                        window_state: -2
                    },
                    trend_sum: {
                        enabled: true,
                        trend_sum: -0.15
                    },
                    trend_state: {
                        enabled: true,
                        trend_state: -2
                    }
                }
            },
            short: {
                issuance: {
                    keyzone_reversal: {
                        enabled: true, // Cannot be disabled
                    }
                },
                cancellation: {
                    window_state: {
                        enabled: true,
                        window_state: 2
                    },
                    trend_sum: {
                        enabled: true,
                        trend_sum: 0.15
                    },
                    trend_state: {
                        enabled: true,
                        trend_state: 2
                    }
                }
            }
        }
    }














    /*****************************
     * Signal Records Management *
     *****************************/






    /**
     * Lists all the signal records within given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<ISignalRecord[]>
     */
    public async listSignalRecords(startAt: number, endAt: number): Promise<ISignalRecord[]> {
        // Validate the request
        this._validations.canRecordsBeListed(startAt, endAt);

        // Finally, return the records
        return await this._model.listSignalRecords(startAt, endAt);
    }
}
