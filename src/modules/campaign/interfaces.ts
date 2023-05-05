import { 
    ICoinsConfiguration, 
    ICoinsObject, 
    IKeyZonesConfiguration, 
    ILiquidityConfiguration, 
    IReversalConfiguration, 
    ITrendStateConfiguration, 
    IWindowStateConfiguration 
} from "../market-state";
import { IPositionHeadline, IPositionStrategy } from "../position";
import { ISignalPolicies } from "../signal";





// Service
export interface ICampaignService {
    // Properties
    balance: IAccountBalance,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Campaign Creation
    buildCampaignSkeleton(): Promise<ICampaignRecord>,
    createCampaign(campaign: ICampaignRecord): Promise<void>,

    // Campaign Ending
    endCampaign(campaignID: string): Promise<void>,

    // Campaign Notes Management
    saveNote(campaignID: string, title: string, description: string): Promise<ICampaignNote[]>,
    listNotes(campaignID: string): Promise<ICampaignNote[]>,

    // Futures Account Balance
    syncBalance(): Promise<void>,

    // Futures Account Income
    syncIncome(): Promise<void>
}





// Validations
export interface ICampaignValidations {
    // Campaign Creation
    canCampaignSkeletonBeBuilt(active: ICampaignRecord|undefined, balance: IAccountBalance): void,
    canCampaignBeCreated(
        active: ICampaignRecord|undefined, 
        balance: IAccountBalance, 
        existingShareHolders: ICampaignShareHolder[],
        lastCampaign: ICampaignRecord|undefined,
        newCampaign: ICampaignRecord
    ): void,
    validateBalanceBasicProperties(balance: IAccountBalance): void,

    // Campaign Notes Management
    canNoteBeSaved(campaignID: string, title: string, description: string): Promise<void>,
    canNotesBeListed(campaignID: string): void
}






// Model
export interface ICampaignModel {
    // Campaign Retrievers
    getLastCampaign(): Promise<ICampaignRecord|undefined>,
    getCampaignSummary(campaignID: string): Promise<ICampaignSummary>,
    getCampaignRecord(campaignID: string): Promise<ICampaignRecord>,
    getConfigsSnapshot(campaignID: string): Promise<ICampaignConfigurationsSnapshot>,

    // Campaign Record Management
    createCampaign(
        campaign: ICampaignRecord,
        configsSnapshot: ICampaignConfigurationsSnapshot
    ): Promise<void>,
    updateCampaign(campaign: ICampaignRecord): Promise<void>,
    endCampaign(
        campaign: ICampaignRecord, 
        headline: ICampaignHeadline,
        shareholdersTXS: IShareHolderTransaction[]
    ): Promise<void>,

    // Campaign Notes Management
    saveNote(note: ICampaignNote): Promise<void>,
    listCampaignNotes(campaignID: string): Promise<ICampaignNote[]>,

    // Income Records Management
    saveIncomeRecords(records: IAccountIncomeRecord[]): Promise<void>,
    getLastIncomeRecordTimestamp(incomeType: IAccountIncomeType): Promise<number|undefined>,
}





// Utilities
export interface ICampaignUtilities {
    // Campaign Creation Helpers
    listShareHolders(): Promise<ICampaignShareHolder[]>,
    buildShareHoldersDataSkeleton(
        shareholders: ICampaignShareHolder[], 
        lastCampaign: ICampaignRecord|undefined,
        totalBalance: number
    ): IShareHoldersData,
    buildConfigurationsSnapshot(): ICampaignConfigurationsSnapshot,

    // Campaign Calculators
    calculateShares(campaignBudget: number, shareholderBalance: number): number
}










/************
 * Campaign *
 ************/




/**
 * Campaign Summary
 * The object containing all the data regarding the campaign and its 
 * performance
 */
export interface ICampaignSummary {
    // The main campaign record
    record: ICampaignRecord,

    // The list of income records generated within the campaign
    income: IAccountIncomeRecord[],

    // The list of positions executed during the campaign
    position_headlines: IPositionHeadline[]
}








/**
 * Campaign Record
 * The main object containing all the information related to a campaign.
 */
export interface ICampaignRecord {
    // Universal Unique Identifier
    id: string,

    // The name and a description/terms of the campaign
    name: string,
    description: string,

    // Date Range
    start: number,
    end: number|undefined, // Only populated once a campaign is closed

    // The maximum loss% allowed before disabling trading (This value must be a negative number)
    max_loss: number,

    // When the campaign's loss reaches the maximum loss%, trading is halted and this property becomes true
    trading_disabled: boolean,

    // The snapshot of the futures account balance when the camapaign was started
    performance: ICampaignPerformance,

    // The list of campaign shareholders
    shareholders: ICampaignShareHolder[],

    // The shareholder's data related to the campaign
    shareholders_data: IShareHoldersData
}




/**
 * Campaign Performance
 * The object containing all the information regarding the operations of a campaign.
 * All values except for initial_balance change constantly until the campaign is closed.
 */
export interface ICampaignPerformance {
    // The snapshot of the futures account balance when the campaign was created
    initial_balance: number,

    // The current futures account balance
    current_balance: number,

    // The accumulated ROI%. This value changes until the campaign is closed
    roi: number,

    // The accumulated PNL. This value changes until the campaign is closed
    pnl: number,

    // The total profit generated by Epoca, derived from the shareholders' profit splits
    epoca_profit: number
}




/**
 * Campaign Shareholder
 * All registered users are potential shareholders. Their participation
 * is determined by their shares on a given campaign.
 */
export interface ICampaignShareHolder {
    // The user's ID
    uid: string,

    // The user's nickname, derived from their email
    nickname: string
}



/**
 * ShareHolder Transaction
 * When a campaign is created, shareholders can generate transactions that
 * alter their balance for the new coming campaign.
 */
export interface IShareHolderTransaction {
    // The USDT amount of the transaction
    amount: number,

    // Brief description of the income/outcome
    description: string
}




/**
 * ShareHolder Data
 * The object containing all the essential information for the shareholders. 
 */
export interface IShareHoldersData {[uid: string]: IShareHolderData};
export interface IShareHolderData {
    // The balance the user had when the previous campaign ended
    previous_balance: number,

    // The transaction that will be added to the previous_balance in order to calculate the original balance
    deposit: IShareHolderTransaction,

    // The transaction that will be deducted from the previous_balance in order to calculate the original balance
    withdraw: IShareHolderTransaction,

    // The balance the shareholder had when the campaign started
    original_balance: number,

    /**
     * The number of shares accumulated based on the user's original_balance 
     * and the campaign's initial_balance.
     */
    shares: number,

    // The percent of the profit that will be assigned to the user
    profit_split: number,

    // The accumulated ROI%. This value changes until the campaign is closed
    roi: number,

    // The accumulated PNL. This value changes until the campaign is closed
    pnl: number,

    // The original balance + the PNL. This value changes until the campaign is closed
    balance: number
}




/**
 * ShareHolder Transaction
 * Whenever a campaign is closed, a transaction is generated for each shareholder
 * so they can visualize their investment individually.
 */
export interface IShareHolderTransaction {
    // The user's ID
    uid: string,

    // The time in which the TX was generated (when the campaign was closed)
    t: number, // Timestamp

    // Campaign Essentials
    cid: string, // Campaign ID
    cn: string, // Campaign Name

    // The profit split assigned to the user at the creation of the campaign
    ps: number, // Profit Split

    // The number of campaign shares the user had during the campaign.
    s: number, // Shares

    // The balance the shareholder had when the campaign started
    ob: number, // Original Balance

    // The accumulated ROI% during the campaign
    r: number, // ROI

    // The accumulated PNL during the campaign
    p: number, // PNL

    // The original balance + the PNL
    b: number, // Balance
}







/**
 * Campaign Headline
 * A minified object containing only essential information.
 */
export interface ICampaignHeadline {
    // Universal Unique Identifier
    id: string,

    // Date Range
    s: number, // Start
    e: number|undefined, // End

    // The name of the campaign
    n: string, // Name

    // When the campaign's loss reaches the maximum loss%, trading is halted and this property becomes true
    td: boolean, // Trading Disabled

    // The accumulated ROI%. This value changes until the campaign is closed
    r: number, // ROI

    // The accumulated PNL. This value changes until the campaign is closed
    p: number, // PNL
}






/**
 * Campaign Note
 * A campaign can have any number of notes. Moreover, they can attached
 * wether the campaign is running or not.
 */
export interface ICampaignNote {
    // The campaign's ID
    cid: string,

    // The time at which the note was created
    t: number, // Timestamp

    // The note's title
    ti: string, // Title

    // The note's description
    d: string // Description
}








/**
 * Campaign Configuration Snapshots
 * When a campaign is created, the configuration snapshots for
 * the core modules are stored so they can be compared later on.
 */
export interface ICampaignConfigurationsSnapshot {
    // Window Configuration
    window: IWindowStateConfiguration,

    // Trend Configuration
    trend: ITrendStateConfiguration,

    // Liquidity Configuration
    liquidity: ILiquidityConfiguration,

    // KeyZones Configuration
    keyzones: IKeyZonesConfiguration,

    // Coins Configuration
    coins: ICoinsConfiguration,
    installed_coins: ICoinsObject,

    // Reversal Configuration
    reversal: IReversalConfiguration,

    // Position Strategy Configuration
    strategy: IPositionStrategy,

    // Signal Policies
    signal_policies: ISignalPolicies
}



















/***********
 * Balance *
 ***********/



/**
 * Account Balance
 * In Epoca, the balance is always referring to USDT and is always extracted
 * fresh from Binance's API.
 */
export interface IAccountBalance {
    // The available balance in the account that can be used to initialize positions
    available: number,

    // The balance that has been allocated to positions (margin)
    on_positions: number,

    // The total balance in the account including unrealized pnl
    total: number,

    // The time in which the balance data was last updated by Binance
    ts: number
}












/**********
 * Income *
 **********/






/**
 * Account Income Record
 * Whenever a campaign is active, the account's income is constantly synced
 * with the balance. Individual records are stored in the database for
 * deeper analysis.
 */
export type IAccountIncomeType = "REALIZED_PNL"|"COMMISSION"|"FUNDING_FEE";
export interface IAccountIncomeRecord {
    // The unique identifier of the transaction
    id: string,

    // The time in milliseconds at which the income was generated
    t: number,

    // The symbol that generated the income
    s: string,

    // The type of income
    it: IAccountIncomeType,

    // The income generated by the transaction (can be a negative value)
    v: number
}
