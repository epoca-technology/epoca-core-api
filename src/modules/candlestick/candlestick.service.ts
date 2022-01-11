import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick, ICandlestickConfig } from "./interfaces";
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

    // Standard Candlestick Configuration
    public readonly standardConfig: ICandlestickConfig = {
        interval: 1, // minutes
        alias: '1m',
        genesis: 1502942400000,
        table: 'candlesticks',
        testTable: 'test_candlesticks',
        localLimit: 60, // ~60 minutes
        syncIntervalSeconds: 20
    };

    // Forecast Candlestick Configuration
    public readonly forecastConfig: ICandlestickConfig = {
        interval: 12, // hours
        alias: '12h',
        genesis: 1502928000000,
        table: 'forecast_candlesticks',
        testTable: 'test_forecast_candlesticks',
        localLimit: 730, // ~1 year
        syncIntervalSeconds: 45
    };


    // Test Modes
    public testMode: boolean = false;




    constructor() {}















    /* Candlestick Retrievers */









    
    /**
     * Retrieves all candlesticks within 2 periods. If none of the periods are provided,
     * it will return all the candlesticks.
     * @param start? 
     * @param end? 
     * @param forecast? 
     * @returns Promise<ICandlestick[]>
     */
    public async get(start?: number, end?: number, forecast?: boolean): Promise<ICandlestick[]> {
        // Init the sql values
        let sql: string = `
            SELECT ot, ct, o, h, l, c, v
            FROM ${this.getTable(forecast)}
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
        return rows.length > 0 ? rows[0].ot: this.getGenesisTimestamp(forecast);
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
            text: `SELECT ot, ct, o, h, l, c, v FROM ${this.getTable(forecast)} ORDER BY ot DESC LIMIT $1`,
            values: [limit || 1]
        });

        // Return the downloaded results
        return rows.reverse();
    }




    









    /**
     * Retrieves the candlesticks for a given period in any interval. 
     * These candlesticks will be based on the 1 minute candlesticks.
     * @IMPORTANT This functionality is only for GUI to be able interact freely 
     * with the standard candlesticks.
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


















    /* Candlestick Syncing & Saving */







    /**
     * Initializes an interval that will update the candlesticks once per minute.
     * @returns Promise<void>
     */
     public async initializeSync(): Promise<void> {
        // Perform the first sync
        await this.runSync();
        await this._utils.asyncDelay(3);
        await this.runSync(true);

        // Initialize the standard interval
        setInterval(() => { this.runSync() }, this.standardConfig.syncIntervalSeconds * 1000);

        // Initialize the forecast interval
        setInterval(() => { this.runSync(true) }, this.forecastConfig.syncIntervalSeconds * 1000);
    }






    /**
     * Runs the syncing functionality and updates the local candlesticks
     * whenever the interval triggers.
     * @param forecast? 
     * @returns Promise<void>
     */
    private async runSync(forecast?: boolean): Promise<void> {
        let candlesticks: ICandlestick[];
        try {
            candlesticks = await this.syncCandlesticks(forecast);
            //this.updateLocal(candlesticks, forecast);
        } catch(e) { 
            console.log(`Failed to sync the ${forecast ? 'Forecast': 'Standard'} Candlesticks, attempting again in a few seconds:`, e);
            await this._utils.asyncDelay(5);
            try {
                candlesticks = await this.syncCandlesticks(forecast);
                //this.updateLocal(candlesticks, forecast);
            } catch (e) {
                console.log(`Failed to sync the ${forecast ? 'Forecast': 'Standard'} candlesticks again, will attempt again in a few seconds:`, e);
            }
        }
    }











    /**
     * Syncs the last standard or forecast candlesticks.
     * @param forecast? 
     * @returns Promise<ICandlestick[]>
     */
    public async syncCandlesticks(forecast?: boolean): Promise<ICandlestick[]> {
        // Init the timestamp
        const startTimestamp: number = await this.getLastOpenTimestamp(forecast);

        // Retrieve the last 1k candlesticks from Binance
        const bCandlesticks: IBinanceCandlestick[] = await this._binance.getCandlesticks(
            forecast ? this.forecastConfig.alias: this.standardConfig.alias, 
            startTimestamp, 
            undefined, 
            1000
        );

        // Make sure that records have been extracted
        if (bCandlesticks && bCandlesticks.length) {
            // Process them and retrieve the latest records
            const candlesticks: ICandlestick[] = this.processBinanceCandlesticks(bCandlesticks);

            // Store them in the DB
            await this.saveCandlesticks(candlesticks, forecast);

            // Return the payload
            return candlesticks;
        }

        // Otherwise, throw an error
        else { 
            console.log(`${forecast ? 'Forecast': 'Standard'} Candlestick Response: `, bCandlesticks);
            throw new Error('The Binance API should have returned at least 1 candlestick.');
        }
    }



    


    


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

                    // If the candlestick exists, update it
                    if (rows && rows.length) {
                        await client.query({
                            text: `
                                UPDATE ${this.getTable(forecast)} SET ct=$1, h=$2, l=$3, c=$4, v=$5
                                WHERE ot=$6
                            `,
                            values: [c.ct, c.h, c.l, c.c, c.v, c.ot]
                        });
                    } 
                    
                    // Otherwise, create it
                    else {
                        await client.query({
                            text: `
                                INSERT INTO ${this.getTable(forecast)}(ot, ct, o, h, l, c, v) 
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
        }
    }














    /* Local Candlesticks - Only to be used if the forecasting was to be done in the nodejs service */






    /**
     * Retrieves the local candlesticks once it has checked that they have been
     * set and that they are synced.
     * @returns ICandlestickPayload
     */
    /*public getLocal(): ILocalCandlesticks {
        return {
            standard: [],
            forecast: []
        }
    }*/







    /**
     * Updates the local candlesticks with a fresh payload.
     * @param candlesticks 
     * @param forecast? 
     * @returns Promise<void>
     */
    /*private async updateLocal(candlesticks: ICandlestick[], forecast?: boolean): Promise<void> {

    }*/









    











    /* Helpers */







    /**
     * Retrieves the genesis candlestick timestamp based
     * on the provided type.
     * @param forecast 
     * @returs number
     */
    private getGenesisTimestamp(forecast?: boolean): number {
        return forecast ? this.forecastConfig.genesis: this.standardConfig.genesis;
    }








    /**
     * Retrieves a table name based on the candlestick type and 
     * the test mode.
     * @param forecast 
     * @returns string
     */
    private getTable(forecast?: boolean): string {
        if (forecast) {
            return this.testMode ? this.forecastConfig.testTable: this.forecastConfig.table;
        } else {
            return this.testMode ? this.standardConfig.testTable: this.standardConfig.table;
        }
    }










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
            ct: candlesticks.at(-1).ct,
            o: candlesticks[0].o,
            h: 0,     // Placeholder
            l: 0,     // Placeholder
            c: candlesticks.at(-1).c,
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