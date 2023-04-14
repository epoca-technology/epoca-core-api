import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IBinanceBalance, IBinanceIncomeRecord, IBinanceService} from "../binance";
import { INotificationService } from "../notification";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    ICampaignService,
    IAccountBalance,
    ICampaignRecord,
    ICampaignValidations,
    ICampaignModel
} from "./interfaces";




@injectable()
export class CampaignService implements ICampaignService {
    // Inject dependencies
    @inject(SYMBOLS.CampaignValidations)        private _validations: ICampaignValidations;
    @inject(SYMBOLS.CampaignModel)              private _model: ICampaignModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.NotificationService)        private _notification: INotificationService;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    /**
     * Active Campaign
     * The active campaign record. If there isn't an active campaign, this value
     * will be undefined.
     */
    private active: ICampaignRecord|undefined;




    /**
     * Futures Account Balance
     * In order for members to be trully involved, the balance is synced
     * every futuresDataIntervalSeconds. Additionally, if there is an active
     * campaign, it will also keep the income in sync.
     */
    public balance: IAccountBalance;
    private incomeSyncCheckpoint: number|undefined = undefined;
    private futuresDataSyncInterval: any;
    private readonly futuresDataIntervalSeconds: number = 60 * 60; // Every ~1 hours







    constructor() {}














    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the campaign module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the default balance and the interval that will keep it synced
        this.setDefaultBalance();
        this.futuresDataSyncInterval = setInterval(async () => {
            try { await this.syncFuturesAccountData() } catch (e) { 
                this._apiError.log("CampaignService.interval.syncFuturesAccountData", e);
                this.setDefaultBalance();
            }
        }, this.futuresDataIntervalSeconds * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.futuresDataSyncInterval) clearInterval(this.futuresDataSyncInterval);
        this.futuresDataSyncInterval = undefined;
    }
























    /************************
     * Futures Account Data *
     ************************/
    




    /**
     * Syncs the balance and the income if there is a 
     * campaign running.
     * @returns Promise<void>
     */
    private async syncFuturesAccountData(): Promise<void> {
        // Sync the balance
        await this.syncBalance();

        // Sync the income after a small delay if there is an active campaign
        if (this.active) {
            await this._utils.asyncDelay(10);
            await this.syncIncome();
        }
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
     * Syncs the futures account income. Keep in mind that if there 
     * isn't an active campaign it throws an error.
     */
    private async syncIncome(): Promise<void> {
        // Ensure there is an active campaign before proceeding
        if (!this.active) {
            throw new Error(this._utils.buildApiError(`The income cannot be synced because there isn't an active campaign.`, 30004));
        }

        // Initialize the current time
        const ts: number = Date.now();

        /**
         * Initialize the starting point based on the active checkpoint.
         * If there is no checkpoint, compare the last stored income record vs the 
         * campaign's start. Whichever is greater should be the starting point.
         */
        let startAt: number|undefined = this.incomeSyncCheckpoint;
        if (typeof startAt != "number") {
            const lastTS: number|undefined = await this._model.getLastIncomeRecordTimestamp();
            if (typeof lastTS == "number" && lastTS > this.active.start) {
                startAt = lastTS + 1; // Increase it by 1ms in order to avoid duplicates
            } else {
                startAt = this.active.start;
            }
        }

        /**
         * Initialize the end of the range. If the value is greater than the
         * current time, use that value instead.
         */
        let endAt: number = moment(startAt).add(5, "days").valueOf();
        if (endAt > ts) { endAt = ts }

        // Retrieve the latest records
        const rawIncomeRecords: IBinanceIncomeRecord[] = await this._binance.getIncome(startAt, endAt);

        // If there are any new trades, store them
        if (rawIncomeRecords.length) {
            // Save the records
            await this._model.saveIncomeRecords(rawIncomeRecords.map((r) => {
                return {
                    id: String(r.tranId),
                    t: r.time,
                    v: <number>this._utils.outputNumber(r.income)
                }
            }));

            // Unset the checkpoint
            this.incomeSyncCheckpoint = undefined;
        }

        // If the list is empty, save the current end so the syncing can move on
        else if (!rawIncomeRecords.length && endAt != ts) { this.incomeSyncCheckpoint = endAt }

        // Otherwise, just unset the checkpoint
        else { this.incomeSyncCheckpoint = undefined }
    }
}
