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
    IPositionHealthCandlesticks,
    IPositionHealthCandlestick,
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
     * @returns Promise<IPositionHealthCandlesticks>
     */
    public async getPositionHealthCandlesticks(side: IBinancePositionSide): Promise<IPositionHealthCandlesticks> {
        // Retrieve the HP & Drawdown candlesticks
        const queryResults: [IQueryResult, IQueryResult] = await Promise.all([
            this._db.query({
                text: `
                    SELECT ot, o, h, l, c FROM ${this._db.tn.position_hp_candlesticks} 
                    WHERE side = $1
                    ORDER BY ot ASC`,
                values: [ side ]
            }),
            this._db.query({
                text: `
                    SELECT ot, o, h, l, c FROM ${this._db.tn.position_dd_candlesticks} 
                    WHERE side = $1
                    ORDER BY ot ASC`,
                values: [ side ]
            })
        ]);
        
        // Finally, pack the results and return them
        return { hp: queryResults[0].rows, dd: queryResults[1].rows }
    }








    /**
     * Deletes all the candlesticks for a given side. This function is
     * invoked after a position has been closed.
     * @param side 
     * @returns Promise<void>
     */
    public async cleanPositionHealthCandlesticks(side: IBinancePositionSide): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Delete the HP Candlesticks
            await client.query({
                text: `DELETE FROM ${this._db.tn.position_hp_candlesticks} WHERE side = $1`,
                values: [ side ]
            });

            // Delete the Drawdown Candlesticks
            await client.query({
                text: `DELETE FROM ${this._db.tn.position_dd_candlesticks} WHERE side = $1`,
                values: [ side ]
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
     * When the time reaches the candlestick's close time, it is 
     * stored and the new one is built.
     * @param hpCandlestick 
     * @param ddCandlestick 
     * @returns Promise<void>
     */
    public async savePositionHealthCandlesticks(
        side: IBinancePositionSide,
        hp: IPositionHealthCandlestick, 
        dd: IPositionHealthCandlestick
    ): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Save the HP Candlestick
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.position_hp_candlesticks}(side, ot, o, h, l, c)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `,
                values: [ side, hp.ot, hp.o, hp.h, hp.l, hp.c ]
            });

            // Save the Drawdown Candlestick
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.position_dd_candlesticks}(side, ot, o, h, l, c)
                    VALUES ($1, $2, $3, $4, $5, $6)
                `,
                values: [ side, dd.ot, dd.o, dd.h, dd.l, dd.c ]
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
