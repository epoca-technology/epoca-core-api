import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick } from "./interfaces";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../shared/database";
import { IUtilitiesService } from "../shared/utilities";
import { IBinanceService, IBinanceCandlestick } from "../shared/binance";
import BigNumber from "bignumber.js";



@injectable()
export class CandlestickService implements ICandlestickService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;

    
    // Genesis Candlestick Timestamp
    public readonly genesisCandlestickTimestamp: number = 1502942400000;


    // Test Mode
    public testMode: boolean = false;




    constructor() {}















    /* Candlestick Retrievers */






    /**
     * Retrieves the candlesticks for a given period in any interval.
     * @param start 
     * @param end 
     * @param intervalMinutes 
     * @returns Promise<ICandlestick[]>
     */
    public async getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]> {
        // Retrieve the 1m candlesticks for the given period
        const candlesticks1m: ICandlestick[] = await this.get(start, end);

        // Return them based in the provided interval
        return this.alterInterval(candlesticks1m, intervalMinutes);
    }








    
    /**
     * Retrieves all candlesticks within 2 periods. If none of the periods are provided,
     * it will return all the candlesticks.
     * @param start? 
     * @param end? 
     * @returns 
     */
    public async get(start?: number, end?: number): Promise<ICandlestick[]> {
        // Init the sql values
        let sql: string = `
            SELECT ot, ct, o, h, l, c, v
            FROM ${this.testMode ? 'test_candlesticks': 'candlesticks'}
        `;
        let values: number[];

        // Check if both timestamps have been provided
        if (typeof start == "number" && typeof end == "number") {
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
            sql += ' WHERE ot <= $1';
            values = [end];
        }

        // Order the candlesticks
        sql += ' ORDER BY ot ASC'

        // Retrieve the candlesticks
        const {rows}: IQueryResult = await this._db.query({text: sql,values: values});

        // Return them
        return rows || [];
    }











    /**
     * Given a symbol, it will retrieve the open time of the last candlestick stored.
     * If none is found, it will return the genesis candlestick timestamp.
     * @returns Promise<number>
     */
    public async getLastOpenTimestamp(): Promise<number> {
        // Retrieve the last candlestick open item
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot FROM ${this.testMode ? 'test_candlesticks': 'candlesticks'} ORDER BY ot DESC LIMIT 1`,
            values: []
        });

        // If no results were found, return the symbol's genesis open time
        return rows.length > 0 ? rows[0].ot: this.genesisCandlestickTimestamp;
    }











    /**
     * Retrieves the latest candlesticks based on the limit provided.
     * @param limit? 
     * @returns Promise<ICandlestick[]>
     */
    public async getLast(limit?: number): Promise<ICandlestick[]> {
        // Init the limit
        limit = typeof limit == "number" ? limit: 1000;

        // Retrieve the candlesticks
        const {rows}: IQueryResult = await this._db.query({
            text: `
                SELECT ot, ct, o, h, l, c, v
                FROM ${this.testMode ? 'test_candlesticks': 'candlesticks'}
                ORDER BY ot DESC
                LIMIT $1
            `,
            values: [limit]
        });

        // Return the reversed candlesticks
        return rows.reverse();
    }

    
    












    /* Candlestick Syncing & Saving */







    /**
     * Initializes an interval that will update the candlesticks once per minute.
     * @returns Promise<void>
     */
     public async initializeSync(): Promise<void> {
        // Perform the first sync
        await this.syncCandlesticks();

        // Initialize the interval
        setInterval(async ()=> {
            // Sync the candlesticks persistently 
            try {
                await this.syncCandlesticks();
            } catch(e) { 
                console.log('Failed to sync candlesticks, attempting again in a few seconds:', e);
                await this._utils.asyncDelay(5);
                try {
                    await this.syncCandlesticks();
                } catch (e) {
                    console.log('Failed to sync candlesticks again, will attempt again in ~30 seconds:', e);
                }
            }
        }, 30000);
    }







    /**
     * Retrieves the last open timestamp and saves new candlesticks.
     * @returns Promise<void>
     */
    private async syncCandlesticks(): Promise<void> {
        // Retrieve the last open timestamp
        const ts: number = await this.getLastOpenTimestamp();

        // Save the candlesticks
        await this.saveCandlesticksFromStart(ts);
    }









    /**
     * Retrieves the candlesticks starting at the provided point and stores them in the DB.
     * If the starting point is not the genesis, it will add 1 to the time in order to prevent
     * a duplicate record.
     * @param startTimestamp 
     * @returns Promise<ICandlestick[]>
     */
     public async saveCandlesticksFromStart(startTimestamp: number): Promise<ICandlestick[]> {
        // Init the timestamp
        startTimestamp = startTimestamp == this.genesisCandlestickTimestamp ? startTimestamp: startTimestamp + 1;

        // Retrieve the last 1k candlesticks from Binance
        const bCandlesticks: IBinanceCandlestick[] = await this._binance.getCandlesticks('1m', startTimestamp, undefined, 1000);

        // Make sure new records were extracted
        if (bCandlesticks && bCandlesticks.length) {
            // Process them
            const processed: ICandlestick[] = this.processBinanceCandlesticks(bCandlesticks);

            // Store them in the DB
            await this.saveCandlesticks(processed);

            // Return the retrieved list
            return processed;
        }
        // Otherwise, return an empty list
        else {
            return [];
        }
    }









    /**
     * Given a list of candlesticks, it will save them to the database.
     * @param candlesticks 
     * @returns Promise<void>
     */
    public async saveCandlesticks(candlesticks: ICandlestick[]): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();

        try {
            // Begin the transaction
            await client.query({text: 'BEGIN'});

            // Insert the candlesticks
            for (let c of candlesticks) {
                await client.query({
                    text: `
                        INSERT INTO ${this.testMode ? 'test_candlesticks': 'candlesticks'}(ot, ct, o, h, l, c, v) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `,
                    values: [c.ot, c.ct, c.o, c.h, c.l, c.c, c.v]
                });
            }

            // Finally, commit the inserts
            await client.query({text: 'COMMIT'});
        } catch (e) {
            // Rollback and rethrow the error
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
    }









    



    /* Helpers */









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
    private mergeCandlesticks(candlesticks: ICandlestick[]): ICandlestick {
        // Init the candlestick
        let final: ICandlestick = {
            ot: candlesticks[0].ot,
            ct: candlesticks[candlesticks.length - 1].ct,
            o: candlesticks[0].o,
            h: 0,     // Placeholder
            l: 0,     // Placeholder
            c: candlesticks[candlesticks.length - 1].c,
            v: 0,     // Placeholder
        };

        // Init the high & low lists
        let high: number[] = [];
        let low: number[] = [];

        // Init the volume accumulator
        let v: BigNumber = new BigNumber(0);

        // Iterate over each candlestick
        candlesticks.forEach((c) => {
            // Append the highs and the lows to the lists
            high.push(c.h);
            low.push(c.l);

            // Accumulate the volumes
            v = v.plus(c.v);
        });

        // Set the highest high and the lowest low
        final.h = BigNumber.max.apply(null, high).toNumber();
        final.l = BigNumber.min.apply(null, low).toNumber();

        // Set the volume accumulation result
        final.v = v.toNumber();

        // Return the final candlestick
        return final;
    }
















    /* Candlesticks Proccessors */






    /**
     * Given a list of binance candlesticks, it will convert them into the correct format
     * in order to be stored in the db.
     * @param candlesticks 
     * @returns ICandlestick[]
     */
    public processBinanceCandlesticks(candlesticks: IBinanceCandlestick[]): ICandlestick[] {
        // Init the list
        let list: ICandlestick[] = [];

        // Iterate over each candlestick and convert it into the proper format
        for (let c of candlesticks) {
            list.push({
                ot: c[0],
                ct: c[6],
                o: <number>this._utils.outputNumber(c[1], {dp: 2}),
                h: <number>this._utils.outputNumber(c[2], {dp: 2}),
                l: <number>this._utils.outputNumber(c[3], {dp: 2}),
                c: <number>this._utils.outputNumber(c[4], {dp: 2}),
                v: <number>this._utils.outputNumber(c[7], {dp: 2})
            });
        }

        // Return the final list
        return list;
    }
}