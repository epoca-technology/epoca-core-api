import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide, IBinanceTradeExecutionPayload } from "../binance";
import { IDatabaseService, IPoolClient } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionHeadline,
    IPositionModel, 
    IPositionRecord, 
    IPositionStrategy,
    IPositionActionKind,
    IPositionActionRecord 
} from "./interfaces";




@injectable()
export class PositionModel implements IPositionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)             private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}











    /*******************************
     * Position Records Management *
     *******************************/






    /**
     * Saves a full position record as well as the headline.
     * @param position 
     * @returns Promise<void>
     */
    public async savePosition(position: IPositionRecord): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Save the position record
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.position_records}(id, data) 
                    VALUES ($1, $2)
                `,
                values: [position.id, position]
            });

            // Save the position headline
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.position_headlines}(id, o, s, sd, iw, g) 
                    VALUES ($1, $2, $3, $4, $5, $6)
                `,
                values: [position.id, position.open, position.coin.symbol, position.side, position.isolated_wallet, position.gain]
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










    /**
     * Retrieves a position record from the db by ID. If no record 
     * is found, it throws an error.
     * @param id 
     * @returns Promise<IPositionRecord>
     */
    public async getPositionRecord(id: string): Promise<IPositionRecord> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.position_records} WHERE id = $1`,
            values: [id]
        });

        // Ensure rows were found
        if (rows.length) {
            return rows[0].data;
        } else {
            throw new Error(this._utils.buildApiError(`The position record ${id} was not found in the database.`, 31000));
        }
    }









    /**
     * Retrieves a list of position headlines for a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionHeadline[]>
     */
    public async listPositionHeadlines(startAt: number, endAt: number): Promise<IPositionHeadline[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT id, o, s, sd, iw, g FROM ${this._db.tn.position_headlines} 
                WHERE o BETWEEN $1 AND $2 ORDER BY o ASC;
            `, 
            values: [startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }













    /**************************************
     * Position Action Payload Management *
     **************************************/





    /**
     * Stores a position action payload into the database.
     * @param kind 
     * @param symbol 
     * @param side 
     * @param payload 
     * @returns Promise<void>
     */
    public async savePositionActionPayload(
        kind: IPositionActionKind, 
        symbol: string,
        side: IBinancePositionSide,
        payload: IBinanceTradeExecutionPayload
    ): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.position_action_payloads}(t, k, s, sd, p) 
                VALUES($1, $2, $3, $4, $5)
            `,
            values: [Date.now(), kind, symbol, side, payload]
        });
    }








    /**
     * Lists the payloads for a kind in a given date range. Note the results
     * are returned in ascending order.
     * @param kind 
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionActionRecord[]>
     */
    public async listPositionActionPayloads(
        kind: IPositionActionKind, 
        startAt: number, 
        endAt: number
    ): Promise<IPositionActionRecord[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT t, k, s, sd, p FROM ${this._db.tn.position_action_payloads} 
                WHERE k = $1 AND t BETWEEN $2 AND $3 ORDER BY t ASC;
            `, 
            values: [kind, startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }















    /*********************
     * Position Strategy *
     *********************/





    /**
     * Retrieves current position strategy. If none has been set,
     * it returns undefined
     * @returns Promise<IPositionStrategy|undefined>
     */
    public async getStrategy(): Promise<IPositionStrategy|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT strategy FROM  ${this._db.tn.position_strategy} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].strategy: undefined;
    }





    /**
     * Stores the default strategy.
     * @param strategy 
     * @returns Promise<void>
     */
    public async createStrategy(strategy: IPositionStrategy): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.position_strategy}(id, strategy) VALUES(1, $1)`,
            values: [strategy]
        });
    }






    /**
     * Updates the current strategy.
     * @param strategy 
     * @returns Promise<void>
     */
     public async updateStrategy(strategy: IPositionStrategy): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.position_strategy} SET strategy=$1 WHERE id=1`,
            values: [strategy]
        });
    }
}
