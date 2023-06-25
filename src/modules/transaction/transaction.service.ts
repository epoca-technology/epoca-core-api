import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IBinanceBalance, IBinanceIncomeRecord, IBinanceService} from "../binance";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    ITransactionService,
    IAccountBalance,
    IAccountIncomeType,
    ITransactionValidations,
    ITransactionModel,
    IAccountIncomeRecord,
} from "./interfaces";




@injectable()
export class TransactionService implements ITransactionService {
    // Inject dependencies
    @inject(SYMBOLS.TransactionValidations)     private _validations: ITransactionValidations;
    @inject(SYMBOLS.TransactionModel)           private _model: ITransactionModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    /**
     * Futures Account Balance
     * The balance is synced frequently and keeps the campaign's data updated.
     */
    public balance: IAccountBalance;
    private balanceSyncInterval: any;
    private readonly balanceIntervalMinutes: number = 20;



    /**
     * Futures Account Income
     * The income is synced frequently whenever there is an active campaign and
     * all records are stored in the db.
     */

    // Income Checkpoints
    private incomeSyncCheckpoints: {[incomeType: string]: number|undefined} = {
        REALIZED_PNL: undefined,
        COMMISSION: undefined,
        FUNDING_FEE: undefined
    }


    // Income Interval
    private incomeSyncInterval: any;
    private readonly incomeIntervalMinutes: number = 45;


    









    constructor() {}














    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the transaction module as well as the intervals
     * that will keep the balance and income in sync.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the default balance and the interval that will keep it synced
        this.setDefaultBalance();
        this.balanceSyncInterval = setInterval(async () => {
            try { await this.syncBalance() } catch (e) { 
                this._apiError.log("TransactionService.interval.syncBalance", e);
            }
        }, (this.balanceIntervalMinutes * 60) * 1000);

        // Initialize the income interval
        this.incomeSyncInterval = setInterval(async () => {
            try { await this.syncIncome() } catch (e) { 
                this._apiError.log("TransactionService.interval.syncIncome", e);
            }
        }, (this.incomeIntervalMinutes * 60) * 1000);
    }







    /**
     * Stops the transaction module entirely.
     */
    public stop(): void { 
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
        if (this.incomeSyncInterval) clearInterval(this.incomeSyncInterval);
        this.incomeSyncInterval = undefined;
    }















    /***************************
     * Futures Account Balance *
     ***************************/





    /**
     * Retrieves the current futures account balance and
     * updates the local property.
     * @returns Promise<void>
     */
    public async syncBalance(): Promise<void> {
        // Retrieve the account balances
        let balances: IBinanceBalance[] = await this._binance.getBalances();

        // Filter all the balances except for USDT
        balances = balances.filter((b) => b.asset == "USDT");
        if (balances.length != 1) {
            console.log(balances);
            throw new Error(this._utils.buildApiError(`The USDT balance could not be retrieved from the Binance API. Received ${balances.length}`, 38000));
        }

        // Ensure all the required properties have been extracted
        if (typeof balances[0].availableBalance != "string" || typeof balances[0].balance != "string") {
            throw new Error(this._utils.buildApiError(`The extracted USDT balance object is not complete. 
            Available ${balances[0].availableBalance} | Balance: ${balances[0].balance}`, 38001));
        }

        // Calculate the balance
        const available: BigNumber = new BigNumber(balances[0].availableBalance);
        const total: BigNumber = new BigNumber(balances[0].balance);

        // Update the local property
        this.balance = {
            available: <number>this._utils.outputNumber(available),
            on_positions: <number>this._utils.outputNumber(total.minus(available)),
            total: <number>this._utils.outputNumber(total),
            ts: balances[0].updateTime || Date.now()
        };
    }




    /**
     * Builds the default Binance Balance object and sets it on the local property.
     * @returns Promise<IBinanceBalance[]>
     */
    private setDefaultBalance(): void {
        this.balance = { available: 0, on_positions: 0, total: 0, ts: Date.now() };
    }



















    /**************************
     * Futures Account Income *
     **************************/




    /**
     * Retrieves all the income records within a date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IAccountIncomeRecord[]>
     */
    public async listIncomeRecords(startAt: number, endAt: number): Promise<IAccountIncomeRecord[]> {
        // Validate the request
        this._validations.validateDateRange(startAt, endAt);

        // Return the db query
        return this._model.listIncomeRecords(startAt, endAt);
    }

    



    /**
     * Syncs the income records by type if there is an active
     * campaign.
     * @returns Promise<void>
     */
    public async syncIncome(): Promise<void> {
        // Initialize the current time
        const ts: number = Date.now();

        // Init the list of errors
        let errors: string[] = [];

        // Sync the REALIZED_PNL
        try {
            await this.syncIncomeByType("REALIZED_PNL", ts);
        } catch (e) {
            errors.push(e);
        }
        
        // Sync the COMMISSION
        await this._utils.asyncDelay(60);
        try {
            await this.syncIncomeByType("COMMISSION", ts);
        } catch (e) {
            errors.push(e);
        }

        // Sync the FUNDING_FEE
        await this._utils.asyncDelay(60);
        try {
            await this.syncIncomeByType("FUNDING_FEE", ts);
        } catch (e) {
            errors.push(e);
        }

        // If there were any errors, rethrow them
        if (errors.length) throw new Error(errors.join(" | "));
    }




    /**
     * Syncs the futures account income by type. If no records have been
     * saved, it will start syncing from 5 days ago.
     * @param incomeType
     * @param currentTS
     * @returns Promise<void>
     */
    private async syncIncomeByType(incomeType: IAccountIncomeType, currentTS: number): Promise<void> {
        /**
         * Initialize the starting point based on the active checkpoint.
         * If there is no checkpoint, retrieve it from the latest record.
         */
        const startAt: number|undefined = typeof this.incomeSyncCheckpoints[incomeType] == "number" ? 
                this.incomeSyncCheckpoints[incomeType]: 
                await this._model.getLastIncomeRecordTimestamp(incomeType);

        /**
         * Initialize the end of the range. If the value is greater than the
         * current time, use that value instead.
         */
        let endAt: number = moment(startAt).add(5, "days").valueOf();
        if (endAt > currentTS) { endAt = currentTS }

        // Retrieve the latest records
        const rawIncomeRecords: IBinanceIncomeRecord[] = await this._binance.getIncome(incomeType, startAt, endAt);

        // If there are any new trades, store them
        if (rawIncomeRecords.length) {
            // Save the records
            await this._model.saveIncomeRecords(rawIncomeRecords.map((r) => {
                return <IAccountIncomeRecord>{
                    id: String(r.tranId),
                    t: r.time,
                    it: <IAccountIncomeType>r.incomeType,
                    v: <number>this._utils.outputNumber(r.income, {ru: true})
                }
            }));

            // Unset the checkpoint
            this.incomeSyncCheckpoints[incomeType] = undefined;
        }

        // If the list is empty, save the current end so the syncing can move on
        else if (!rawIncomeRecords.length && endAt != currentTS) { this.incomeSyncCheckpoints[incomeType] = endAt }

        // Otherwise, just unset the checkpoint
        else { this.incomeSyncCheckpoints[incomeType] = undefined }
    }
}
