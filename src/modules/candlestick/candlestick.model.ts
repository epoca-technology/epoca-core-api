import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
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

    // Forecast Candlestick Configuration
    public readonly forecastConfig: ICandlestickConfig = {
        intervalMinutes: 30,
        alias: '30m'
    };


    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;



    
    constructor() {}















    /* Candlestick Retrievers */









    
    /**
     * Retrieves all candlesticks within 2 periods. If none of the periods are provided,
     * it will return all the candlesticks.
     * @param start? 
     * @param end? 
     * @param limit? 
     * @param forecast? 
     * @returns Promise<ICandlestick[]>
     */
    public async get(start?: number, end?: number, limit?: number, forecast?: boolean): Promise<ICandlestick[]> {
        // Init the sql values
        let sql: string = `
            SELECT ot, ct, o, h, l, c, v, tbv, nt
            FROM ${this.getTable(forecast)}
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
     * @param forecast?
     * @returns Promise<number>
     */
    public async getLastOpenTimestamp(forecast?: boolean): Promise<number> {
        // Retrieve the last candlestick open item
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot FROM ${this.getTable(forecast)} ORDER BY ot DESC LIMIT 1`,
            values: []
        });

        // If no results were found, return the genesis open time
        return rows.length > 0 ? rows[0].ot: this._binance.candlestickGenesisTimestamp;
    }












    /**
     * Retrieves the last candlesticks ordered by ot. If there are no candlesticks it
     * will return an empty list.
     * @param forecast?
     * @param limit?
     * @returns Promise<ICandlestick[]>
     */
     public async getLast(forecast?: boolean, limit?: number): Promise<ICandlestick[]> {
        // Retrieve the last candlestick
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot, ct, o, h, l, c, v, tbv, nt FROM ${this.getTable(forecast)} ORDER BY ot DESC LIMIT $1`,
            values: [limit || 1]
        });

        // Return the downloaded results
        return rows.reverse();
    }




    















    /* Candlestick Saving */


    


    


    /**
     * Given a list of candlesticks, it will create or update them on the database.
     * @param candlesticks 
     * @param forecast? 
     * @returns Promise<void>
     */
    public async saveCandlesticks(candlesticks: ICandlestick[], forecast?: boolean): Promise<void> {
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
                        text: `SELECT ct FROM ${this.getTable(forecast)} WHERE ot=$1`,
                        values: [c.ot]
                    });

                    // If the candlestick exists, update it - The open price & open time don't need to be updated
                    if (rows && rows.length) {
                        await client.query({
                            text: `
                                UPDATE ${this.getTable(forecast)} SET ct=$1, h=$2, l=$3, c=$4, v=$5, tbv=$6, nt=$7
                                WHERE ot=$8
                            `,
                            values: [c.ct, c.h, c.l, c.c, c.v, c.tbv, c.nt, c.ot]
                        });
                    } 
                    
                    // Otherwise, create it
                    else {
                        await client.query({
                            text: `
                                INSERT INTO ${this.getTable(forecast)}(ot, ct, o, h, l, c, v, tbv, nt) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                            `,
                            values: [c.ot, c.ct, c.o, c.h, c.l, c.c, c.v, c.tbv, c.nt]
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
            console.log(`${forecast ? 'Forecast': 'Standard'} Candlesticks: `, candlesticks);
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
     * Given a list of candlesticks, it will merge the properties and return a 
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
            v: 0,   // Placeholder
            tbv: 0, // Placeholder
            nt: 0,  // Placeholder
        };

        // Init the high & low lists
        let high: number[] = [];
        let low: number[] = [];

        // Init the accumulators
        let v: BigNumber = new BigNumber(0);
        let tbv: BigNumber = new BigNumber(0);
        let nt: BigNumber = new BigNumber(0);

        // Iterate over each candlestick
        candlesticks.forEach((c) => {
            // Append the highs and the lows to the lists
            high.push(c.h);
            low.push(c.l);

            // Update accumulators
            v = v.plus(c.v);
            tbv = tbv.plus(c.tbv);
            nt = nt.plus(c.nt);
        });

        // Set the highest high and the lowest low
        final.h = BigNumber.max.apply(null, high).toNumber();
        final.l = BigNumber.min.apply(null, low).toNumber();

        // Set the accumulator results
        final.v = v.toNumber();
        final.tbv = tbv.toNumber();
        final.nt = nt.toNumber();

        // Return the final candlestick
        return final;
    }

















    /* Misc Helpers */









    /**
     * Retrieves a table name based on the candlestick type and 
     * the test mode.
     * @param forecast 
     * @returns string
     */
     private getTable(forecast?: boolean): string {
        return forecast ? this._db.tn.forecast_candlesticks: this._db.tn.candlesticks;
    }










    /**
     * Given the open time of a candlestick, it will calculate it's close 
     * time based on the forecast config.
     * @param ot 
     * @returns number
     */
    public getForecastCandlestickCloseTime(ot: number): number {
        return moment(ot).add(this.forecastConfig.intervalMinutes, "minutes").subtract(1, "millisecond").valueOf();
    }
}