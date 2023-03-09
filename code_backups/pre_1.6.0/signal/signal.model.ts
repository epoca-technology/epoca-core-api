import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { 
    ISignalModel,
    ISignalPolicies
} from "./interfaces";


@injectable()
export class SignalModel implements ISignalModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)             private _db: IDatabaseService;



    constructor() {}






    /**
     * Retrieves current signal policies. If none have been set,
     * it returns undefined
     * @returns Promise<ISignalPolicies|undefined>
     */
    public async getPolicies(): Promise<ISignalPolicies|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT policies FROM  ${this._db.tn.signal_policies} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].policies: undefined;
    }





    /**
     * Stores the default signal policies.
     * @param policies 
     * @returns Promise<void>
     */
    public async createPolicies(policies: ISignalPolicies): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.signal_policies}(id, policies) VALUES(1, $1)`,
            values: [policies]
        });
    }






    /**
     * Updates the current policies for both sides.
     * @param policies 
     * @returns Promise<void>
     */
     public async updatePolicies(policies: ISignalPolicies): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.signal_policies} SET policies=$1 WHERE id=1`,
            values: [policies]
        });
    }
}
