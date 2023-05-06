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
    ICampaignModel,
    IAccountIncomeType,
    ICampaignShareHolder,
    ICampaignConfigurationsSnapshot,
    IShareHoldersData,
    ICampaignUtilities,
    ICampaignNote,
    ICampaignSummary,
    ICampaignHeadline,
    IShareHolderTransaction
} from "./interfaces";




@injectable()
export class CampaignService implements ICampaignService {
    // Inject dependencies
    @inject(SYMBOLS.CampaignValidations)        private _validations: ICampaignValidations;
    @inject(SYMBOLS.CampaignModel)              private _model: ICampaignModel;
    @inject(SYMBOLS.CampaignUtilities)          private _campaignUtils: ICampaignUtilities;
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
     * Initializes the campaign module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the default balance and the interval that will keep it synced
        this.setDefaultBalance();
        this.balanceSyncInterval = setInterval(async () => {
            try { await this.syncBalance() } catch (e) { 
                this._apiError.log("CampaignService.interval.syncBalance", e);
            }
        }, (this.balanceIntervalMinutes * 60) * 1000);

        // Initialize the income interval
        this.incomeSyncInterval = setInterval(async () => {
            try { await this.syncIncome() } catch (e) { 
                this._apiError.log("CampaignService.interval.syncIncome", e);
            }
        }, (this.incomeIntervalMinutes * 60) * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
        if (this.incomeSyncInterval) clearInterval(this.incomeSyncInterval);
        this.incomeSyncInterval = undefined;
    }
















    /*********************
     * Campaign Creation *
     *********************/







    /**
     * Builds the Campaign Skeleton that will be used to 
     * initialize one.
     * @returns Promise<ICampaignRecord>
     */
    public async buildCampaignSkeleton(): Promise<ICampaignRecord> {
        // Update the balance
        await this.syncBalance();

        // Validate the request
        this._validations.canCampaignSkeletonBeBuilt(this.active, this.balance);

        // Retrieve the shareholders & the last campaign
        const values: [ICampaignShareHolder[], ICampaignRecord|undefined] = await Promise.all([
            this._campaignUtils.listShareHolders(),
            this._model.getLastCampaign()
        ]);

        // Build the shareholders' skeleton data
        const shareholdersData: IShareHoldersData = this._campaignUtils.buildShareHoldersDataSkeleton(
            values[0], 
            values[1], 
            this.balance.total
        );

        // Finally, return the build
        return {
            id: this._utils.generateID(),
            name: "",
            description: "",
            start: Date.now(),
            end: undefined,
            max_loss: -40,
            trading_disabled: false,
            performance: {
                initial_balance: this.balance.total,
                current_balance: this.balance.total,
                roi: 0,
                pnl: 0,
                epoca_profit: 0
            },
            shareholders: values[0],
            shareholders_data: shareholdersData
        }
    }









    /**
     * Creates a brand new campaign which takes effect
     * immediately.
     * @param campaign 
     * @returns Promise<void>
     */
    public async createCampaign(campaign: ICampaignRecord): Promise<void> {
        // Update the balance
        await this.syncBalance();

        // Retrieve the shareholders & the last campaign
        const values: [ICampaignShareHolder[], ICampaignRecord|undefined] = await Promise.all([
            this._campaignUtils.listShareHolders(),
            this._model.getLastCampaign()
        ]);

        // Retrieve the shareholders & validate the request
        this._validations.canCampaignBeCreated(this.active, this.balance, values[0], values[1], campaign);

        // Build the configs snapshot
        const configsSnapshot: ICampaignConfigurationsSnapshot = this._campaignUtils.buildConfigurationsSnapshot();

        // Store the campaign and set it in the local property
        // @TODO
        this.active = campaign;

        // Notify users
        this._notification.campaignStarted(this.active);
    }











    /*******************
     * Campaign Ending *
     *******************/





    /**
     * Ends an active campaign based on its ID.
     * @param campaignID 
     * @returns Promise<void>
     */
    public async endCampaign(campaignID: string): Promise<void> {
        // @TODO
    }


















    /*****************************
     * Campaign Notes Management *
     *****************************/





    /**
     * Saves a note into the database. Once the process is complete,
     * it returns the full refreshed list of notes.
     * @param campaignID 
     * @param title 
     * @param description 
     * @returns Promise<ICampaignNote[]>
     */
    public async saveNote(campaignID: string, title: string, description: string): Promise<ICampaignNote[]> {
        // Validate the request
        await this._validations.canNoteBeSaved(campaignID, title, description);

        // Save the record
        await this._model.saveNote({
            cid: campaignID,
            t: Date.now(),
            ti: title,
            d: description
        });

        // Finally, return the updated list
        return this._model.listCampaignNotes(campaignID);
    }





    /**
     * Lists all the notes for a given campaign.
     * @param campaignID 
     * @returns Promise<ICampaignNote[]>
     */
    public async listNotes(campaignID: string): Promise<ICampaignNote[]> {
        // Validate the request
        this._validations.canNotesBeListed(campaignID);

        // Finally, return the list
        return this._model.listCampaignNotes(campaignID);
    }











    /**********************
     * General Retrievers *
     **********************/







    /**
     * Retrieves the full summary for a campaign.
     * @param campaignID 
     * @returns Promise<ICampaignSummary>
     */
    public async getCampaignSummary(campaignID: string): Promise<ICampaignSummary> {
        // Validate the request
        this._validations.canCampaignSummaryBeRetrieved(campaignID);

        // Finally, return the summary
        return await this._model.getCampaignSummary(campaignID);
    }

    







    /**
     * Retrieves the configurations snapshot for a campaign.
     * @param campaignID 
     * @returns Promise<ICampaignConfigurationsSnapshot>
     */
    public async getConfigurationsSnapshot(campaignID: string): Promise<ICampaignConfigurationsSnapshot> {
        // Validate the request
        await this._validations.canConfigurationsSnapshotBeRetrieved(campaignID);

        // Finally, return the config
        return await this._model.getConfigsSnapshot(campaignID);
    }








    /**
     * Retrieves the list of campaign headlines for a given date range.
     * @param startAt
     * @param endAt
     * @returns Promise<ICampaignHeadline[]>
     */
    public async listHeadlines(startAt: number, endAt: number): Promise<ICampaignHeadline[]> {
        // Validate the request
        this._validations.validateDateRange(startAt, endAt);

        // Retrieve the headlines
        let headlines: ICampaignHeadline[] = await this._model.listHeadlines(startAt, endAt);

        // If there is an active campaign, add it to the list
        if (this.active) {
            // @TODO
        }

        // Finally, return the headlines
        return headlines;
    }







    /**
     * Lists the shareholders transactions for a given date range.
     * @param uid 
     * @param startAt 
     * @param endAt 
     * @returns Promise<IShareHolderTransaction[]>
     */
    public async listShareHolderTransactions(
        uid: string, 
        startAt: number, 
        endAt: number
    ): Promise<IShareHolderTransaction[]> {
        // Validate the date range
        this._validations.validateDateRange(startAt, endAt);

        // Retrieve the txs
        let txs: IShareHolderTransaction[] = await this._model.listShareHolderTransactions(uid, startAt, endAt)

        // If there is an active campaign, add it to the list
        if (this.active) {
            // @TODO
        }

        // Return the TXS
        return txs;
    }















    /***************************
     * On Balance Update Event *
     ***************************/





    /**
     * Whenever the balance is updated and there is an active
     * campaign, it checks if it is healthy. Otherwise, it
     * notifies users.
     * @returns Promise<void>
     */
    private async onBalanceUpdate(): Promise<void> {
        if (this.active) {

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

        // Trigger the balance update event
        this.onBalanceUpdate();
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
     * Syncs the income records by type if there is an active
     * campaign.
     * @returns Promise<void>
     */
    public async syncIncome(): Promise<void> {
        if (this.active) {
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
    }




    /**
     * Syncs the futures account income. Keep in mind that if there 
     * isn't an active campaign it throws an error.
     * @param incomeType
     * @param currentTS
     * @returns Promise<void>
     */
    private async syncIncomeByType(incomeType: IAccountIncomeType, currentTS: number): Promise<void> {
        /**
         * Initialize the starting point based on the active checkpoint.
         * If there is no checkpoint, compare the last stored income record vs the 
         * campaign's start. Whichever is greater should be the starting point.
         */
        let startAt: number|undefined = this.incomeSyncCheckpoints[incomeType];
        if (typeof startAt != "number") {
            const lastTS: number|undefined = await this._model.getLastIncomeRecordTimestamp(incomeType);
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
        if (endAt > currentTS) { endAt = currentTS }

        // Retrieve the latest records
        const rawIncomeRecords: IBinanceIncomeRecord[] = await this._binance.getIncome(incomeType, startAt, endAt);

        // If there are any new trades, store them
        if (rawIncomeRecords.length) {
            // Save the records
            await this._model.saveIncomeRecords(rawIncomeRecords.map((r) => {
                return {
                    id: String(r.tranId),
                    t: r.time,
                    s: r.symbol,
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
