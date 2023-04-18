import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IBinanceBalance, IBinanceIncomeRecord, IBinanceService} from "../binance";
import { IAuthService, IUser } from "../auth";
import { 
    ICoinsService,
    IKeyZonesStateService, 
    ITrendStateService, 
    IWindowStateService,
} from "../market-state";
import { IPositionService } from "../position";
import { ISignalService } from "../signal";
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
    IShareHoldersData
} from "./interfaces";




@injectable()
export class CampaignService implements ICampaignService {
    // Inject dependencies
    @inject(SYMBOLS.CampaignValidations)        private _validations: ICampaignValidations;
    @inject(SYMBOLS.CampaignModel)              private _model: ICampaignModel;
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.AuthService)                private _auth: IAuthService;
    @inject(SYMBOLS.WindowStateService)         private _window: IWindowStateService;
    @inject(SYMBOLS.KeyZonesStateService)       private _keyzones: IKeyZonesStateService;
    @inject(SYMBOLS.TrendStateService)          private _trend: ITrendStateService;
    @inject(SYMBOLS.CoinsService)               private _coins: ICoinsService;
    @inject(SYMBOLS.PositionService)            private _position: IPositionService;
    @inject(SYMBOLS.SignalService)              private _signal: ISignalService;
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

        // Retrieve the shareholders
        const shareholders: ICampaignShareHolder[] = await this.listShareHolders();

        // Build the shareholders' skeleton data
        const shareholdersData: IShareHoldersData = await this.buildShareHoldersDataSkeleton(); // @TODO

        // Finally, return the build
        return {
            id: this._utils.generateID(),
            name: "",
            description: "",
            start: Date.now(),
            end: undefined,
            max_loss: -40,
            performance: {
                initial_balance: this.balance.total,
                current_balance: this.balance.total,
                roi: 0,
                pnl: 0,
                epoca_profit: 0
            },
            shareholders: shareholders,
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

        // Retrieve the shareholders & validate the request
        const shareholders: ICampaignShareHolder[] = await this.listShareHolders();
        this._validations.canCampaignBeCreated(this.active, this.balance, shareholders, campaign);

        // Build the configs snapshot
        const configsSnapshot: ICampaignConfigurationsSnapshot = this.buildConfigurationsSnapshot();

        // Store the campaign and set it in the local property
        // @TODO
        this.active = campaign;

        // Notify users
        // @TODO
    }










    /* Campaign Creation Helpers */








    /**
     * Retrieves the list of Epoca Users and converts them into
     * ShareHolder Format.
     * @returns Promise<ICampaignShareHolder[]>
     */
    private async listShareHolders(): Promise<ICampaignShareHolder[]> {
        // Retrieve all the users
        const users: IUser[] = await this._auth.getAll();
        if (!users.length) {
            throw new Error(this._utils.buildApiError(`The list of shareholders could not be retrieved because there are no users.`, 38003));
        }

        // Finally, return the list
        return users.map((u) => { return { uid: u.uid, nickname: this.fromEmailToNickname(u.email) } });
    }
    private fromEmailToNickname(email: string): string {
        // Extract the raw nickname from the email
        const rawNickname: string = email.split("@")[0];

        // Init the size of the slice
        const sliceSize: number = rawNickname.length > 4 ? 2: 1;

        // Finally, put together the nickname
        return `${rawNickname.slice(0, 2)}...${rawNickname.slice(-sliceSize)}`;
    }








    /**
     * Builds the shareholders' data skeleton based on the balance
     * from the previous campaign (if any).
     * @returns Promise<IShareHoldersData>
     */
    private async buildShareHoldersDataSkeleton(): Promise<IShareHoldersData> {
        return {}// @TODO
    }










    /**
     * Builds the configurations snapshot that will be stored when
     * a campaign is created.
     * @returns ICampaignConfigurationsSnapshot
     */
    private buildConfigurationsSnapshot(): ICampaignConfigurationsSnapshot {
        const { installed, supported, scores } = this._coins.getCoinsSummary();
        return {
            window: this._window.config,
            keyzones: this._keyzones.config,
            trend: this._trend.config,
            coins: this._coins.config,
            installed_coins: installed,
            strategy: this._position.strategy,
            signal_policies: this._signal.policies
        }
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
    private async syncIncome(): Promise<void> {
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
