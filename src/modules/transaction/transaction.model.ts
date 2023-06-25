import {inject, injectable} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IAccountIncomeRecord, 
    IAccountIncomeType, 
    ITransactionModel
} from "./interfaces";




@injectable()
export class TransactionModel implements ITransactionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)            private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;








    constructor() {}








    /*****************************
     * Income Records Management *
     *****************************/






    /**
     * Retrieves all the income records within a date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IAccountIncomeRecord[]>
     */
    public async listIncomeRecords(startAt: number, endAt: number): Promise<IAccountIncomeRecord[]> {
        // Retrieve the income records
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.income_records} 
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
                        INSERT INTO ${this._db.tn.income_records}(id, t, it, v) 
                        VALUES ($1, $2, $3, $4)
                    `,
                    values: [rec.id, rec.t, rec.it, rec.v]
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
     * has been executed, it returns the timestamp for 5 days prior
     * to the current time as Binance's API provides 7 days tops.
     * @param incomeType
     * @returns Promise<number>
     */
    public async getLastIncomeRecordTimestamp(incomeType: IAccountIncomeType): Promise<number> {
        // Retrieve the last trade's timestamp
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT t FROM ${this._db.tn.income_records} 
                WHERE it = $1 ORDER BY t DESC LIMIT 1
            `,
            values: [ incomeType ]
        });

        // If no results were found, return undefined
        return rows.length > 0 ? rows[0].t: moment().subtract(5, "days").valueOf();
    }
}
