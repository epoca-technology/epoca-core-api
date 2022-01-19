import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick, ICandlestickConfig, ICandlestickValidations } from "./interfaces";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../shared/database";
import { IUtilitiesService } from "../shared/utilities";
import { IBinanceService, IBinanceCandlestick } from "../shared/binance";
import BigNumber from "bignumber.js";
import * as moment from 'moment';


@injectable()
export class CandlestickService implements ICandlestickService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickValidations)             private _validations: ICandlestickValidations;



    // Standard Candlestick Configuration
    public readonly standardConfig: ICandlestickConfig = {
        intervalMinutes: 1,
        alias: '1m',
        table: 'candlesticks',
        testTable: 'test_candlesticks'
    };

    // Forecast Candlestick Configuration
    public readonly forecastConfig: ICandlestickConfig = {
        intervalMinutes: 30,
        alias: '30m',
        table: 'forecast_candlesticks',
        testTable: 'test_forecast_candlesticks'
    };

    // Candlestick Syncing Interval
    private readonly syncIntervalSeconds: number = 10;


    // Test Modes
    public testMode: boolean = false;





    
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
        // Validate Request
        this._validations.canGetForPeriod(start, end, intervalMinutes);

        // If the interval minutes match the forecast candlesticks, return those instead
        if (intervalMinutes == this.forecastConfig.intervalMinutes) {
            return await this.get(start, end, undefined, true);
        } 
        
        // Otherwise, download the 1m candlesticks and alter their interval if needed.
        else {
            // Retrieve the 1m candlesticks for the given period
            const candlesticks1m: ICandlestick[] = await this.get(start, end);

            // Return them based in the provided interval
            return intervalMinutes > 1 ? this.alterInterval(candlesticks1m, intervalMinutes): candlesticks1m;
        }
    }


















    /* Candlestick Syncing & Saving */







    /**
     * Initializes an interval that will update the candlesticks once per minute.
     * @returns Promise<void>
     */
     public async initializeSync(): Promise<void> {
        // Perform the first sync
        await this.syncCandlesticks()

        // Initialize the interval
        setInterval(async () => { 
            try { await this.syncCandlesticks() } 
            catch(e) { 
                console.log(`Failed to sync the Candlesticks, attempting again in a few seconds:`, e);
                await this._utils.asyncDelay(5);
                try { await this.syncCandlesticks() } 
                catch (e) {
                    console.log(`Failed to sync the candlesticks again, will attempt again in a few seconds:`, e);
                }
            }
         }, this.syncIntervalSeconds * 1000);
    }
















    /**
     * Syncs the last standard and forecast candlesticks.
     * @returns Promise<ICandlestick[]>
     */
    public async syncCandlesticks(): Promise<ICandlestick[]> {
        // Init the timestamp
        const startTimestamp: number = await this.getLastOpenTimestamp();

        // Retrieve the last 1k candlesticks from Binance
        const bCandlesticks: IBinanceCandlestick[] = await this._binance.getCandlesticks(
            this.standardConfig.alias, 
            startTimestamp, 
            undefined, 
            1000
        );

        // Make sure that records have been extracted
        if (bCandlesticks && bCandlesticks.length) {
            // Process them and retrieve the latest records
            const candlesticks: ICandlestick[] = this.processBinanceCandlesticks(bCandlesticks);

            // Store them in the DB
            await this.saveCandlesticks(candlesticks);

            // Sync the forecast candlesticks as well
            await this.syncForecastCandlesticks();

            // Return the 1m payload
            return candlesticks;
        }

        // Otherwise, throw an error
        else { 
            console.log(`Candlestick Response: `, bCandlesticks);
            throw new Error('The Binance API should have returned at least 1 candlestick.');
        }
    }







    /**
     * Whenever 1m candlesticks are saved, the forecast candlesticks
     * are also updated respecting the interval configuration.
     * @returns Promise<void>
     */
    private async syncForecastCandlesticks(): Promise<void> {
        // Init vars
        let last: ICandlestick[];
        let candlesticks1m: ICandlestick[];
        let futureCandlesticks1m: ICandlestick[];
        let merged: ICandlestick;
        let openTime: number;
        let closeTime: number;
        let remaining: boolean = true;

        // Iterate until there are no 1m candlesticks left to sync
        while (remaining) {
            // Retrieve the last candlestick
            last = await this.getLast(true, 1);
           
            // Check if candlesticks have been found
            if (last.length) {
                // Calculate the close time of the current candlestick
                closeTime = this.getForecastCandlestickCloseTime(last[0].ot);

                // Check if the last candlestick has been completed
                if (last[0].ct == closeTime) {
                    // Initialize the new candlestick's times
                    openTime = closeTime + 1;
                    closeTime = this.getForecastCandlestickCloseTime(openTime);

                    // Download the candlesticks for the next interval
                    candlesticks1m = await this.get(openTime, closeTime);

                    // If candlesticks were found, merge and save them.
                    if (candlesticks1m.length) { 
                        // Make sure the open time of the first 1m candlestick is correct
                        candlesticks1m[0].ot = openTime;

                        // Make sure the close time doesn't exceed the proper close time
                        if (candlesticks1m.at(-1).ct > closeTime) candlesticks1m[candlesticks1m.length - 1].ct = closeTime;

                        // Save the merged candlestick
                        await this.saveCandlesticks([this.mergeCandlesticks(candlesticks1m)], true);
                    }

                    //  Otherwise, check if they are actually synced
                    else { 
                        // Download future candlesticks
                        futureCandlesticks1m = await this.get(openTime, undefined, 1);

                        /**
                         * If there are candlesticks in the future means that some data is missing
                         * on the exchange's end. 
                         */
                        if (futureCandlesticks1m.length) {
                            // Iterate until the next candlestick is found
                            let nextCandlestickFound: boolean = false;
                            while (!nextCandlestickFound) {
                                // Initialize the next candlestick's times
                                openTime = closeTime + 1;
                                closeTime = this.getForecastCandlestickCloseTime(openTime);

                                // Retrieve the 1m candlesticks
                                candlesticks1m = await this.get(openTime, closeTime);

                                // Check if candlesticks were found
                                if (candlesticks1m.length) {
                                    // Merge the candlesticks
                                    merged = this.mergeCandlesticks(candlesticks1m);

                                    // Make sure the open time is correct
                                    merged.ot = openTime;

                                    // Make sure the close time doesn't exceed the proper close time
                                    if (merged.ct > closeTime) merged.ct = closeTime;

                                    /**
                                     * If the candlestick is less than the close time, there shouldn't be any
                                     * data for the future candlestick. If there is, mark the current candlestick
                                     * as closed.
                                     */
                                    futureCandlesticks1m = await this.get(closeTime + 1, undefined, 1);
                                    if (futureCandlesticks1m.length) merged.ct = closeTime;

                                    // Save the merged candlestick
                                    await this.saveCandlesticks([merged], true);

                                    // The interval has been found
                                    nextCandlestickFound = true;
                                }
                            }
                        } 
                        
                        // Otherwise, it means the forecast candlesticks are in sync
                        else { remaining = false }
                    }
                }

                // The candlestick needs to be completed
                else {
                    // Download the candlesticks for the current interval
                    candlesticks1m = await this.get(last[0].ot, closeTime);

                    // Check if candlesticks were found
                    if (candlesticks1m.length) { 
                        // Merge the candlesticks
                        merged = this.mergeCandlesticks(candlesticks1m);

                        // Make sure the close time doesn't exceed the proper close time
                        if (merged.ct > closeTime) merged.ct = closeTime;

                        /**
                         * If the candlestick is less than the close time, there shouldn't be any
                         * data for the future candlestick. If there is, mark the current candlestick
                         * as closed.
                         */
                        futureCandlesticks1m = await this.get(closeTime + 1, undefined, 1);
                        if (futureCandlesticks1m.length) merged.ct = closeTime;

                        // Update the candlestick
                        await this.saveCandlesticks([merged], true);

                        // Check if it is in sync
                        remaining = last[0].ct !== merged.ct;
                    }

                    // Otherwise, check if they are actually synced
                    else {
                        // Download future candlesticks
                        futureCandlesticks1m = await this.get(last[0].ct, undefined, 1);

                        /**
                         * If there are candlesticks in the future means that some data is missing
                         * on the exchange's end. 
                         */
                        if (futureCandlesticks1m.length) {
                            // Update the last candlestick and set the correct close time.
                            last[0].ct = closeTime;

                            // Update it
                            await this.saveCandlesticks(last, true);
                        } 
                        
                        // Otherwise, it means the forecast candlesticks are in sync
                        else { remaining = false }
                    }
                }
            }

            // Otherwise, save the genesis candlestick
            else {
                // Calculate the genesis close time
                closeTime = this.getForecastCandlestickCloseTime(this._binance.candlestickGenesisTimestamp);

                // Retrieve the 1m candlesticks for the given interval
                candlesticks1m = await this.get(this._binance.candlestickGenesisTimestamp, closeTime);

                // If candlesticks were found, merge and save them.
                if (candlesticks1m.length) { 
                    // Make sure the close time doesn't exceed the proper close time
                    if (candlesticks1m.at(-1).ct > closeTime) candlesticks1m[candlesticks1m.length - 1].ct = closeTime;

                    // Save the candlesticks
                    await this.saveCandlesticks([this.mergeCandlesticks(candlesticks1m)], true);
                }

                // Otherwise, end the execution as no 1m candlesticks have been found
                else { remaining = false }
            }
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
            throw new Error('A valid list of candlesticks is required in order to invoke saveCandlesticks.');
        }
    }










    











    /* Helpers */









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











    /**
     * Given the open time of a candlestick, it will calculate it's close 
     * time based on the forecast config.
     * @param ot 
     * @returns number
     */
     private getForecastCandlestickCloseTime(ot: number): number {
        return moment(ot).add(this.forecastConfig.intervalMinutes, "minutes").subtract(1, "millisecond").valueOf();
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
                v: <number>this._utils.outputNumber(c[7], {dp: 2}),
                tbv: <number>this._utils.outputNumber(c[10], {dp: 2}),
                nt: c[8],
            });
        }

        // Return the final list
        return list;
    }
}