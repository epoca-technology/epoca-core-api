import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IAccountIncomeRecord, 
    IAccountIncomeType, 
    ICampaignConfigurationsSnapshot, 
    ICampaignHeadline, 
    ICampaignModel, 
    ICampaignNote, 
    ICampaignRecord, 
    ICampaignSummary, 
    IShareHolderTransaction 
} from "./interfaces";
import { IPositionHeadline, IPositionService } from "../position";




@injectable()
export class CampaignModel implements ICampaignModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)            private _db: IDatabaseService;
    @inject(SYMBOLS.PositionService)            private _position: IPositionService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;








    constructor() {}









    /***********************
     * Campaign Retrievers *
     ***********************/




    /**
     * Retrieves the last campaign that took place. If none has, it returns
     * undefined.
     * @returns Promise<ICampaignRecord|undefined>
     */
    public async getLastCampaign(): Promise<ICampaignRecord|undefined> {
        // Retrieve the last record
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT data FROM ${this._db.tn.campaign_records} ORDER BY start DESC LIMIT 1`,
            values: [  ]
        });

        // If no results were found, return undefined
        return rows.length > 0 ? rows[0].data: undefined;
    }






    /**
     * Retrieves the entire campaign summary. Note that an error will
     * be thrown if the campaign is not found.
     * @param campaignID 
     * @returns Promise<ICampaignSummary>
     */
    public async getCampaignSummary(campaignID: string): Promise<ICampaignSummary> {
        // Firstly, retrieve the campaign record
        const record: ICampaignRecord = await this.getCampaignRecord(campaignID);

        // Set the end of the range based on the status of the campaign
        const endAt: number = record.end ? record.end: Date.now();

        // Retrieve the income and the position headlines
        const values: [IAccountIncomeRecord[], IPositionHeadline[]] = await Promise.all([
            this.listIncomeRecords(record.start, endAt),
            this._position.listPositionHeadlines(record.start, endAt)
        ]);

        // Finally, return the summary
        return { record: record, income: values[0], position_headlines: values[1] };
    }






    /**
     * Retrieves the campaign record for a given ID. Notice that
     * it throws an error if the campaign is not found.
     * @param campaignID 
     * @returns Promise<ICampaignRecord>
     */
    public async getCampaignRecord(campaignID: string): Promise<ICampaignRecord> {
        // Retrieve the last trade's timestamp
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT data FROM ${this._db.tn.campaign_records} 
                WHERE id = $1
            `,
            values: [ campaignID ]
        });

        // Ensure the record was found
        if (!rows.length) {
            throw new Error(this._utils.buildApiError(`The record for the campaign ${campaignID} was not found in the database.`, 40001));
        }

        // Return the snapshot
        return rows[0].data;
    }







    /**
     * Retrieves the configs snapshots for a given campaign ID. Notice that
     * it throws an error if the campaign is not found.
     * @param campaignID 
     * @returns Promise<ICampaignConfigurationsSnapshot>
     */
    public async getConfigsSnapshot(campaignID: string): Promise<ICampaignConfigurationsSnapshot> {
        // Retrieve the last trade's timestamp
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT data FROM ${this._db.tn.campaign_configurations_snapshots} 
                WHERE id = $1
            `,
            values: [ campaignID ]
        });

        // Ensure the snapshot was found
        if (!rows.length) {
            throw new Error(this._utils.buildApiError(`The configs snapshot for the campaign ${campaignID} was not found in the database.`, 40000));
        }

        // Return the snapshot
        return rows[0].data;
    }









    /**
     * Retrieves the list of campaign headlines in descending order. Note that 
     * if there is an active campaign, it should be appended to this list.
     * @param startAt 
     * @param endAt 
     * @returns Promise<ICampaignHeadline[]>
     */
    public async listHeadlines(startAt: number, endAt: number): Promise<ICampaignHeadline[]> {
        // Retrieve the income records
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.campaign_headlines} 
                WHERE s BETWEEN $1 AND $2 ORDER BY s DESC;
            `, 
            values: [startAt, endAt]
        });

        // Finally, return them
        return rows;
    }














    /******************************
     * Campaign Record Management *
     ******************************/








    /**
     * Creates a campaign record as well as the configurations snapshot.
     * @param campaign 
     * @param configsSnapshot 
     * @returns Promise<void>
     */
    public async createCampaign(
        campaign: ICampaignRecord,
        configsSnapshot: ICampaignConfigurationsSnapshot
    ): Promise<void> {
        // @TODO 
    }





    /**
     * Triggers whenever the balance is updated and the active campaign is
     * recalculated.
     * @param campaign 
     * @returns Promise<void>
     */
    public async updateCampaign(campaign: ICampaignRecord): Promise<void> {
        // @TODO
    }







    /**
     * Stops an active campaign, saves the record, the headline and
     * the users' transactions.
     * @param campaign 
     * @param headline 
     * @param shareholdersTXS 
     * @returns Promise<void>
     */
    public async endCampaign(
        campaign: ICampaignRecord, 
        headline: ICampaignHeadline,
        shareholdersTXS: IShareHolderTransaction[]
    ): Promise<void> {
        // @TODO 
        
        /**
         * REMEMBER TO MANAGE THE HEADLINE BOOLEAN ACCORDINGLY AS POSTGRES SUPPORTS IT 
         * AS A STRING. EXAMPLE:
         * const slo: string = position.stop_loss_order && typeof position.stop_loss_order == "object" ? "true": "false";
         */
    }













    /*****************************
     * Campaign Notes Management *
     *****************************/






    /**
     * Saves a campaign note in to the database.
     * @param note 
     * @returns Promise<void>
     */
    public async saveNote(note: ICampaignNote): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.campaign_notes}(cid, t, ti, d) 
                VALUES ($1, $2, $3, $4)
            `,
            values: [note.cid, note.t, note.ti, note.d]
        });
    }





    /**
     * Retrieves all the notes for a campaign in descending order.
     * @param campaignID
     * @returns Promise<ICampaignNote[]>
     */
    public async listCampaignNotes(campaignID: string): Promise<ICampaignNote[]> {
        // Retrieve the trades
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.campaign_notes} 
                WHERE cid = $1 ORDER BY t DESC;
            `, 
            values: [campaignID]
        });

        // Finally, return them
        return rows;
    }








    



    /****************************
     * ShareHolder Transactions *
     ****************************/






    /**
     * Retrieves the list of shareholder transactions for a user for a 
     * given date range.
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
        // Retrieve the income records
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.campaign_shareholders_transactions} 
                WHERE uid = $1 AND t BETWEEN $2 AND $3 ORDER BY t DESC;
            `, 
            values: [uid, startAt, endAt]
        });

        // Finally, return them
        return rows;
    }
















    /*****************************
     * Income Records Management *
     *****************************/






    /**
     * Retrieves all the income records within a date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IAccountIncomeRecord[]>
     */
    private async listIncomeRecords(startAt: number, endAt: number): Promise<IAccountIncomeRecord[]> {
        // Retrieve the income records
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.campaign_income_records} 
                WHERE t BETWEEN $1 AND $2 ORDER BY t ASC;
            `, 
            values: [startAt, endAt]
        });

        // Finally, return them
        return rows;
    }







    /**
     * Saves a list of freshly retrieved income records into the db.
     * @param records 
     * @returns Promise<void>
     */
    public async saveIncomeRecords(records: IAccountIncomeRecord[]): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Insert the records
            for (let rec of records) {
                await client.query({
                    text: `
                        INSERT INTO ${this._db.tn.campaign_income_records}(id, t, s, it, v) 
                        VALUES ($1, $2, $3, $4, $5)
                    `,
                    values: [rec.id, rec.t, rec.s, rec.it, rec.v]
                });
            }

            // Finally, commit the writes
            await client.query({text: "COMMIT"});
        } catch (e) {
            // Rollback and rethrow the error
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    }





    /**
     * Looks for the latest income record by type in the db. If none
     * has been executed, it returns undefined.
     * @param incomeType
     * @returns Promise<number|undefined>
     */
    public async getLastIncomeRecordTimestamp(incomeType: IAccountIncomeType): Promise<number|undefined> {
        // Retrieve the last trade's timestamp
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT t FROM ${this._db.tn.campaign_income_records} 
                WHERE it = $1 ORDER BY t DESC LIMIT 1
            `,
            values: [ incomeType ]
        });

        // If no results were found, return undefined
        return rows.length > 0 ? rows[0].t: undefined;
    }
}
