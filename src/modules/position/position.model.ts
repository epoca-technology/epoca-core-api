import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionModel, 
    IPositionStrategy, 
    IPositionTrade,
    IPositionHealthState,
    IPositionHealthCandlestickRecord,
} from "./interfaces";




@injectable()
export class PositionModel implements IPositionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)             private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}











    /*********************
     * Position Strategy *
     *********************/





    /**
     * Retrieves current position strategy. If none has been set,
     * it returns undefined
     * @returns Promise<IPositionStrategy|undefined>
     */
    public async getStrategy(): Promise<IPositionStrategy|undefined> {
        // Retrieve the user
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













    /*******************
     * Position Health *
     *******************/




    /**
     * Retrieves current position health. If none has been set,
     * it returns undefined
     * @returns Promise<IPositionHealthState|undefined>
     */
    public async getHealth(): Promise<IPositionHealthState|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT health FROM  ${this._db.tn.position_health} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].health: undefined;
    }





    /**
     * Stores the health record.
     * @param health 
     * @returns Promise<void>
     */
    public async createHealth(health: IPositionHealthState): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.position_health}(id, health) VALUES(1, $1)`,
            values: [health]
        });
    }






    /**
     * Updates the current health.
     * @param health 
     * @returns Promise<void>
     */
     public async updateHealth(health: IPositionHealthState): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.position_health} SET health=$1 WHERE id=1`,
            values: [health]
        });
    }















    /********************************
     * Position Health Candlesticks *
     ********************************/






    /**
     * Retrieves the candlesticks for a given side. If there are no candlesticks
     * on the side, it will return empty lists.
     * @param side 
     * @returns Promise<IPositionHealthCandlestickRecord[]>
     */
    public async getPositionHealthCandlesticks(side: IBinancePositionSide): Promise<IPositionHealthCandlestickRecord[]> {
        // Retrieve the candlesticks
        const { rows } = await this._db.query({
            text: `
                SELECT ot, d FROM ${this._db.tn.position_hp_candlesticks} 
                WHERE side = $1
                ORDER BY ot ASC`,
            values: [ side ]
        });

        // Return them
        return rows;
    }








    /**
     * Deletes all the candlesticks for a given side. This function is
     * invoked after a position has been closed.
     * @param side 
     * @returns Promise<void>
     */
    public async cleanPositionHealthCandlesticks(side: IBinancePositionSide): Promise<void> {
        await this._db.query({
            text: `DELETE FROM ${this._db.tn.position_hp_candlesticks} WHERE side = $1`,
            values: [ side ]
        });
    }




    


    /**
     * When the time reaches the candlestick's close time, it is 
     * stored and the new one is built.
     * @param side
     * @param record
     * @returns Promise<void>
     */
    public async savePositionHealthCandlestick(side: IBinancePositionSide, record: IPositionHealthCandlestickRecord): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.position_hp_candlesticks}(side, ot, d)
                VALUES ($1, $2, $3)
            `,
            values: [ side, record.ot, record.d ]
        });
    }

















    /*******************
     * Position Trades *
     *******************/





    /**
     * Retrieves all the position trades within a date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPositionTrade[]>
     */
    public async listTrades(startAt: number, endAt: number): Promise<IPositionTrade[]> {
        // Retrieve the trades
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT * FROM ${this._db.tn.position_trades} 
                WHERE t >= $1 AND t <= $2 
                ORDER BY t ASC
            `, 
            values: [startAt, endAt]
        });

        // Finally, return them
        return rows;
    }






    /**
     * Saves a list of freshly retrieved trades into the db.
     * @param trades 
     * @returns Promise<void>
     */
    public async saveTrades(trades: IPositionTrade[]): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Insert the trades
            for (let t of trades) {
                await client.query({
                    text: `
                        INSERT INTO ${this._db.tn.position_trades}(id, t, s, ps, p, qty, qqty, rpnl, c) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    `,
                    values: [t.id, t.t, t.s, t.ps, t.p, t.qty, t.qqty, t.rpnl, t.c]
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
     * Looks for the latest executed trade in the db. If none
     * has been executed, it returns undefined.
     * @returns Promise<number|undefined>
     */
    public async getLastTradeTimestamp(): Promise<number|undefined> {
        // Retrieve the last trade's timestamp
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT t FROM ${this._db.tn.position_trades} ORDER BY t DESC LIMIT 1`,
            values: []
        });

        // If no results were found, return undefined
        return rows.length > 0 ? rows[0].t: undefined;
    }
}
