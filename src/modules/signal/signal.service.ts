import {inject, injectable} from "inversify";
import { BehaviorSubject, Subscription } from "rxjs";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { 
    ICoinsState, 
    IKeyZoneStateEvent, 
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
     * Idle Symbols
     * Whenever a signal is generated for a symbol, it enters idle state for a
     * period of time in which no new signals will be issued.
     */
    private idleSymbols: {[symbol: string]: number} = {}; // Symbol: Idle Until
    private readonly idleDurationMinutes: number = 5;





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
            !this.isWindowStateCancelling(ds.keyzoneStateEvent.k, ds.windowState) &&
            !this.isTrendCancelling(ds.keyzoneStateEvent.k, ds.trendSum, ds.trendState) &&
            this.isKeyZoneReversalComplying(ds.keyzoneStateEvent.k, ds.trendSum, ds.trendState, ds.volumeState)
        ) {
            // Init the time
            const ts: number = Date.now();

            // Retrieve the signal symbols
            const symbols: string[] = this.getSignalSymbols(ds.keyzoneStateEvent, ds.coinsState, ts);

            // Check if symbols were found
            if (symbols.length) {
                // Build the signal record
                record = {
                    t: ts,
                    r: ds.keyzoneStateEvent.k == "s" ? 1: -1,
                    s: symbols
                };

                // Activate the idle state on the signal symbols
                this.activateIdle(symbols);
            }
        }

        // Broadcast the signal
        this.active.next(record);

        // If a signal was built, store it
        if (record) await this._model.saveRecord(record);
    } 















    /* Issuance Policies */





    /**
     * Verifies if the trendSum, state & volume state comply with
     * the signal type.
     * @param kind 
     * @param trendSum 
     * @param trendState 
     * @param volumeState 
     * @returns boolean
     */
    private isKeyZoneReversalComplying(
        kind: IKeyZoneStateEventKind,
        trendSum: number,
        trendState: IStateType,
        volumeState: IStateType
    ): boolean {
        return  this.isTrendSumCompliying(kind, trendSum) && 
                this.isTrendStateCompliying(kind, trendState) &&
                this.isVolumeStateCompliying(kind, volumeState);
    }






    /**
     * Evaluates if the trend sum is complying with the kind of keyzone event.
     * @param kind 
     * @param trendSum 
     * @returns boolean
     */
    private isTrendSumCompliying(kind: IKeyZoneStateEventKind, trendSum: number): boolean {
        // Check if the Trend Sum is complying for a long
        if (kind == "s") {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.long.issuance.keyzone_reversal.trend_sum != 0) {
                return trendSum >= this.policies.long.issuance.keyzone_reversal.trend_sum;
            }

            // If the policy requirement is 0, the trend sum is always complying
            else { return true }
        }

        // Check if the Trend Sum is complying for a short
        else {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.short.issuance.keyzone_reversal.trend_sum != 0) {
                return trendSum <= this.policies.short.issuance.keyzone_reversal.trend_sum;
            }

            // If the policy requirement is 0, the trend sum is always complying
            else { return true }
        }
    }




    /**
     * Evaluates if the trend state is complying with the kind of keyzone event.
     * @param kind 
     * @param trendState 
     * @returns boolean
     */
    private isTrendStateCompliying(kind: IKeyZoneStateEventKind, trendState: IStateType): boolean {
        // Check if the Trend State is complying for a long
        if (kind == "s") {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.long.issuance.keyzone_reversal.trend_state != 0) {
                return trendState >= this.policies.long.issuance.keyzone_reversal.trend_state;
            }

            // If the policy requirement is 0, the trend state is always complying
            else { return true }
        }

        // Check if the Trend State is complying for a short
        else {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.short.issuance.keyzone_reversal.trend_state != 0) {
                return trendState <= this.policies.short.issuance.keyzone_reversal.trend_state;
            }

            // If the policy requirement is 0, the trend state is always complying
            else { return true }
        }
    }







    /**
     * Evaluates if the volume state is complying.
     * @param kind 
     * @param volumeState 
     * @returns boolean
     */
    private isVolumeStateCompliying(kind: IKeyZoneStateEventKind, volumeState: IStateType): boolean {
        // Check if the Volume State is complying for a long
        if (kind == "s") {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.long.issuance.keyzone_reversal.volume_state != 0) {
                return volumeState >= this.policies.long.issuance.keyzone_reversal.volume_state;
            }

            // If the policy requirement is 0, the volume state is always complying
            else { return true }
        }

        // Check if the Volume State is complying for a short
        else {
            // Firstly, ensure the policy's requirement is not 0
            if (this.policies.short.issuance.keyzone_reversal.volume_state != 0) {
                return volumeState >= this.policies.short.issuance.keyzone_reversal.volume_state;
            }

            // If the policy requirement is 0, the volume state is always complying
            else { return true }
        }
    }










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
            currentState >= this.policies.long.cancellation.window_state.window_state
        ) {
            return true;
        }

        // Evaluate if a short should be cancelled
        else if (
            kind == "r" &&
            this.policies.short.cancellation.window_state.enabled &&
            currentState <= this.policies.short.cancellation.window_state.window_state
        ) {
            return true;
        }

        // Otherwise, the window state policy is not cancelling
        else { return false }
    }

    



    /**
     * Evaluates if the trend policy is currently cancelling
     * the KeyZone Event Kind.
     * @param kind 
     * @param trendSum 
     * @param trendState 
     * @returns boolean
     */
    private isTrendCancelling(kind: IKeyZoneStateEventKind, trendSum: number, trendState: IStateType): boolean {
        // Evaluate if a long should be cancelled
        if (
            kind == "s" &&
            this.policies.long.cancellation.trend.enabled &&
            (this.policies.long.cancellation.trend.trend_sum == 0 || trendSum <= this.policies.long.cancellation.trend.trend_sum) &&
            (this.policies.long.cancellation.trend.trend_state == 0 || trendState <= this.policies.long.cancellation.trend.trend_state)
        ) {
            return true;
        }

        // Evaluate if a short should be cancelled
        else if (
            kind == "r" &&
            this.policies.short.cancellation.trend.enabled &&
            (this.policies.short.cancellation.trend.trend_sum == 0 || trendSum >= this.policies.short.cancellation.trend.trend_sum) &&
            (this.policies.short.cancellation.trend.trend_state == 0 || trendState >= this.policies.short.cancellation.trend.trend_state)
        ) {
            return true;
        }

        // Otherwise, the trend state policy is not cancelling
        else { return false }
    }









    /* Signal Symbols */





    /**
     * Retrieves the symbols that comply with the keyzone event
     * and the market state. It also ensures none of the symbols
     * are idle.
     * @param kzEvent 
     * @param coinsState 
     * @param currentTime 
     * @returns string[]
     */
    private getSignalSymbols(
        kzEvent: IKeyZoneStateEvent, 
        coinsState: ICoinsState, 
        currentTime: number
    ): string[] {
        // Init the symbols
        let symbols: string[] = [];

        // Iterate over each coin
        for (let symbol in coinsState) {
            // Check if a long should be opened for the symbol
            if (
                kzEvent.k == "s" &&
                coinsState[symbol].se <= this.policies.long.issuance.keyzone_reversal.coin_state_event &&
                kzEvent.t < coinsState[symbol].set &&
                !this.isIdle(symbol, currentTime)
            ) {
                symbols.push(symbol);
            }

            // Check if a short should be opened for the symbol
            else if (
                kzEvent.k == "r" &&
                coinsState[symbol].se >= this.policies.short.issuance.keyzone_reversal.coin_state_event &&
                kzEvent.t < coinsState[symbol].set &&
                !this.isIdle(symbol, currentTime)
            ) {
                symbols.push(symbol);
            }
        }

        // Finally, return the signal symbols
        return symbols;
    }















    /* Idle State Helpers */




    /**
     * Activates the idle for a list of symbols.
     * @param symbols 
     */
    private activateIdle(symbols: string[]): void {
        symbols.forEach((s) => {
            this.idleSymbols[s] = moment().add(this.idleDurationMinutes, "minutes").valueOf();
        });
    }




    /**
     * Checks if a symbol is currently idle.
     * @param symbol 
     * @param currentTime 
     * @returns boolean
     */
    private isIdle(symbol: string, currentTime: number): boolean {
        return typeof this.idleSymbols[symbol] == "number" && currentTime <= this.idleSymbols[symbol];
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
            volumeState: ms.volume,
            coinsState: ms.coins,
            keyzoneStateEvent: ms.keyzones.event ? ms.keyzones.event: undefined
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
                        coin_state_event: -1, // Cannot be disabled
                        trend_sum: 0,
                        trend_state: 0,
                        volume_state: 0,
                    }
                },
                cancellation: {
                    window_state: {
                        enabled: true,
                        window_state: 2
                    },
                    trend: {
                        enabled: true,
                        trend_sum: -3,
                        trend_state: 0
                    }
                }
            },
            short: {
                issuance: {
                    keyzone_reversal: {
                        enabled: true, // Cannot be disabled
                        coin_state_event: 1, // Cannot be disabled
                        trend_sum: 0,
                        trend_state: 0,
                        volume_state: 0
                    }
                },
                cancellation: {
                    window_state: {
                        enabled: true,
                        window_state: -2
                    },
                    trend: {
                        enabled: true,
                        trend_sum: 3,
                        trend_state: 0
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
