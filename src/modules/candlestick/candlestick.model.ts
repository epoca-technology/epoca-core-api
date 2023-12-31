import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import BigNumber from "bignumber.js";
import * as moment from 'moment';
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { IBinanceService } from "../binance";
import { ICandlestickModel, ICandlestick, ICandlestickConfig } from "./interfaces";


@injectable()
export class CandlestickModel implements ICandlestickModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;



    // Standard Candlestick Configuration
    public readonly standardConfig: ICandlestickConfig = {
        intervalMinutes: 1,
        alias: '1m'
    };

    // Prediction Candlestick Configuration
    public readonly predictionConfig: ICandlestickConfig = {
        intervalMinutes: 15,
        alias: '15m'
    };




    
    constructor() {}















    /* Candlestick Retrievers */









    
    /**
     * Retrieves all candlesticks within 2 periods. If none of the periods are provided,
     * it will return all the candlesticks.
     * @param start? 
     * @param end? 
     * @param limit? 
     * @param prediction? 
     * @returns Promise<ICandlestick[]>
     */
    public async get(start?: number, end?: number, limit?: number, prediction?: boolean): Promise<ICandlestick[]> {
        // Init the sql values
        let sql: string = `
            SELECT ot, ct, o, h, l, c, v
            FROM ${this.getTable(prediction)}
        `;
        let values: number[];

        // Check if both timestamps have been provided
        if (typeof start == "number" && typeof end == "number") {
            if (limit != undefined) throw new Error(`The limit parameter is not allowed when start and end are provided.`);
            sql += ' WHERE ot >= $1 AND ot <= $2';
            values = [start, end];
        }

        // If only the start is provided
        else if (typeof start == "number") {
            sql += ' WHERE ot >= $1';
            values = [start];
        }

        // If only the end is provided
        else if (typeof end == "number") {
            if (limit != undefined) throw new Error(`The limit parameter is not allowed when only the end timestamp is provided.`);
            sql += ' WHERE ot <= $1';
            values = [end];
        }

        // Order the candlesticks
        sql += ' ORDER BY ot ASC';

        // Check if a limit was provided and make sure that only the start or the end were provided
        if (typeof limit == "number" && values.length == 1) {
            sql += ' LIMIT $2';
            values.push(limit);
        }

        // Retrieve the candlesticks
        const {rows}: IQueryResult = await this._db.query({text: sql, values: values});

        // Return them
        return rows;
    }











    /**
     * Retrieves the open time of the last candlestick stored.
     * If none is found, it will return the genesis candlestick timestamp.
     * @param prediction?
     * @returns Promise<number>
     */
    public async getLastOpenTimestamp(prediction?: boolean): Promise<number> {
        // Retrieve the last candlestick open item
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot FROM ${this.getTable(prediction)} ORDER BY ot DESC LIMIT 1`,
            values: []
        });

        // If no results were found, return the genesis open time
        return rows.length > 0 ? rows[0].ot: this._binance.candlestickGenesisTimestamp;
    }












    /**
     * Retrieves the last candlesticks ordered by ot. If there are no candlesticks it
     * will return an empty list.
     * @param prediction?
     * @param limit?
     * @returns Promise<ICandlestick[]>
     */
     public async getLast(prediction?: boolean, limit?: number): Promise<ICandlestick[]> {
        // Retrieve the last candlestick
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot, ct, o, h, l, c, v FROM ${this.getTable(prediction)} ORDER BY ot DESC LIMIT $1`,
            values: [limit || 1]
        });

        // Return the downloaded results
        return rows.reverse();
    }




    















    /* Candlestick Saving */


    


    


    /**
     * Given a list of candlesticks, it will create or update them on the database.
     * @param candlesticks 
     * @param prediction? 
     * @returns Promise<void>
     */
    public async saveCandlesticks(candlesticks: ICandlestick[], prediction?: boolean): Promise<void> {
        // Save the candlesticks if any
        if (candlesticks && candlesticks.length) {
            // Initialize the client
            const client: IPoolClient = await this._db.pool.connect();
            try {
                // Begin the transaction
                await client.query({text: 'BEGIN'});

                // Insert the candlesticks
                for (let c of candlesticks) {
                    // Check if the candlestick exists
                    const {rows}: IQueryResult = await client.query({
                        text: `SELECT ct FROM ${this.getTable(prediction)} WHERE ot=$1`,
                        values: [c.ot]
                    });

                    // If the candlestick exists, update it - The open price & open time don't need to be updated
                    if (rows && rows.length) {
                        await client.query({
                            text: `
                                UPDATE ${this.getTable(prediction)} SET ct=$1, h=$2, l=$3, c=$4, v=$5
                                WHERE ot=$6
                            `,
                            values: [c.ct, c.h, c.l, c.c, c.v, c.ot]
                        });
                    } 
                    
                    // Otherwise, create it
                    else {
                        await client.query({
                            text: `
                                INSERT INTO ${this.getTable(prediction)}(ot, ct, o, h, l, c, v) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7)
                            `,
                            values: [c.ot, c.ct, c.o, c.h, c.l, c.c, c.v]
                        });
                    }
                }

                // Finally, commit the writes
                await client.query({text: 'COMMIT'});
            } catch (e) {
                // Rollback and rethrow the error
                await client.query('ROLLBACK');
                throw e;
            } finally {
                client.release();
            }
        } else {
            console.log(`${prediction ? 'Prediction': 'Standard'} Candlesticks: `, candlesticks);
            throw new Error(this._utils.buildApiError('A valid list of candlesticks is required in order to invoke saveCandlesticks.', 1200));
        }
    }



















    /* Candlestick Merging */






    /**
     * Given a list of 1 minute candlesticks, it will alter the intervals according
     * to provided value.
     * @param candlesticks1m 
     * @param intervalMinutes 
     * @returns ICandlestick[]
     */
    public alterInterval(candlesticks1m: ICandlestick[], intervalMinutes: number): ICandlestick[] {
        // Init the new list
        let list: ICandlestick[] = [];

        // Iterate over new interval
        let prev: number = 0;
        for (let i = 0; i < Math.ceil(candlesticks1m.length / intervalMinutes); i++) {
            if (candlesticks1m[prev]) {
                list.push(this.mergeCandlesticks(candlesticks1m.slice(prev, prev + intervalMinutes)));
                prev = prev + intervalMinutes;
            }
        }


        // Return the final list
        return list;
    }












    /**
     * Given a list of candlesticks, it will merge the properties and return an 
     * unified object.
     * @param candlesticks 
     * @returns ICandlestick
     */
    public mergeCandlesticks(candlesticks: ICandlestick[]): ICandlestick {
        // Init the candlestick
        let final: ICandlestick = {
            ot: candlesticks[0].ot,
            ct: candlesticks.at(-1).ct,
            o: candlesticks[0].o,
            h: 0,   // Placeholder
            l: 0,   // Placeholder
            c: candlesticks.at(-1).c,
            v: 0    // Placeholder
        };

        // Init the high & low lists
        let high: number[] = [];
        let low: number[] = [];

        // Init the accumulators
        let v: BigNumber = new BigNumber(0);

        // Iterate over each candlestick
        candlesticks.forEach((c) => {
            // Append the highs and the lows to the lists
            high.push(c.h);
            low.push(c.l);

            // Update accumulators
            v = v.plus(c.v);
        });

        // Set the highest high and the lowest low
        final.h = BigNumber.max.apply(null, high).toNumber();
        final.l = BigNumber.min.apply(null, low).toNumber();

        // Set the accumulator results
        final.v = v.toNumber();

        // Return the final candlestick
        return final;
    }

















    /* Misc Helpers */









    /**
     * Retrieves a table name based on the candlestick type and 
     * the test mode.
     * @param prediction 
     * @returns string
     */
     private getTable(prediction?: boolean): string {
        return prediction ? this._db.tn.prediction_candlesticks: this._db.tn.candlesticks;
    }










    /**
     * Given the open time of a candlestick, it will calculate it's close 
     * time based on the prediction config.
     * @param ot 
     * @returns number
     */
    public getPredictionCandlestickCloseTime(ot: number): number {
        return moment(ot).add(this.predictionConfig.intervalMinutes, "minutes").subtract(1, "millisecond").valueOf();
    }
}