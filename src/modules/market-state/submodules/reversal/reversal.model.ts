import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IDatabaseService, IPoolClient } from "../../../database";
import { IUtilitiesService } from "../../../utilities";
import {
    IReversalCoinsStates,
    IReversalConfiguration,
    IReversalModel,
    IReversalState,
} from "./interfaces";




@injectable()
export class ReversalModel implements IReversalModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;




    constructor() { }







    /*****************************
     * Reversal State Management *
     *****************************/





    /**
     * Retrieves a reversal event by ID. Checks the active state before
     * querying the db. Notice that if the state is not found, it will
     * throw an error.
     * @param id 
     * @returns Promise<IReversalState>
     */
    public async getReversalState(id: number): Promise<IReversalState> {
        // Retrieve the state
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.reversal_states} WHERE id = $1`,
            values: [ id ]
        });

        // Ensure it was found
        if (!rows.length) {
            throw new Error(this._utils.buildApiError(`The provided reversal id (${id}) was not found in the database.`, 37506));
        }

        // Return the state
        return rows[0].data;
    }






    /**
     * Retrieves a reversal coins states by ID. Checks the active state before
     * querying the db. Notice that if the state is not found, it will
     * throw an error.
     * @param id 
     * @returns Promise<IReversalCoinsStates>
     */
    public async getReversalCoinsStates(id: number): Promise<IReversalCoinsStates> {
        // Retrieve the state
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.reversal_coins_states} WHERE id = $1`,
            values: [ id ]
        });

        // Ensure it was found
        if (!rows.length) {
            throw new Error(this._utils.buildApiError(`The provided reversal id (${id}) was not found in the database.`, 37506));
        }

        // Return the state
        return rows[0].data;
    }








    /**
     * Saves a reversal and the coins state into the db.
     * @param state 
     * @param coinsStates 
     * @returns Promise<void>
     */
    public async saveState(state: IReversalState, coinsStates: IReversalCoinsStates): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Save the state
            await client.query({
                text: `INSERT INTO ${this._db.tn.reversal_states}(id, data) VALUES($1, $2)`,
                values: [ state.id, state ]
            });

            // Save the coins' state
            await client.query({
                text: `INSERT INTO ${this._db.tn.reversal_coins_states}(id, data) VALUES($1, $2)`,
                values: [ state.id, coinsStates ]
            });

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

























    /***********************************
     * Configuration Record Management *
     ***********************************/







    /**
     * Retrieves the Reversal's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IReversalConfiguration|undefined>
     */
    public async getConfigurationRecord(): Promise<IReversalConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.reversal_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Reversal's Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    public async createConfigurationRecord(
        defaultConfiguration: IReversalConfiguration
    ): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.reversal_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Reversal's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfigurationRecord(newConfiguration: IReversalConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.reversal_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }
}