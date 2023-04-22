import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    ISignalModel,
    ISignalPolicies,
    ISignalRecord
} from "./interfaces";




@injectable()
export class SignalModel implements ISignalModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)               private _utils: IUtilitiesService;







    constructor() {}











    /******************************
     * Signal Policies Management *
     ******************************/






    /**
     * Retrieves current signal policies. If none have been set,
     * it returns undefined
     * @returns Promise<ISignalPolicies|undefined>
     */
    public async getPolicies(): Promise<ISignalPolicies|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.signal_policies} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Stores the default signal policies.
     * @param policies 
     * @returns Promise<void>
     */
    public async createPolicies(policies: ISignalPolicies): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.signal_policies}(id, data) VALUES(1, $1)`,
            values: [policies]
        });
    }






    /**
     * Updates the current policies.
     * @param policies 
     * @returns Promise<void>
     */
     public async updatePolicies(policies: ISignalPolicies): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.signal_policies} SET data=$1 WHERE id=1`,
            values: [policies]
        });
    }














    /*****************************
     * Signal Records Management *
     *****************************/






    /**
     * Queries the signal records based on the provided params and returns
     * them ordered by date descending.
     * @param startAt 
     * @param endAt
     * @returns Promise<ISignalRecord[]>
     */
    public async listSignalRecords(startAt: number, endAt: number): Promise<ISignalRecord[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT t, r, s FROM ${this._db.tn.signal_records}  
                WHERE t BETWEEN $1 AND $2 ORDER BY t DESC;
            `, 
            values: [startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }








    /**
     * Saves a signal record in the db.
     * @param record 
     * @returns Promise<void>
     */
    public async saveRecord(record: ISignalRecord): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.signal_records}(t, r, s) 
                VALUES ($1, $2, $3)
            `,
            values: [record.t, record.r, JSON.stringify(record.s)]
        });
    }
}
