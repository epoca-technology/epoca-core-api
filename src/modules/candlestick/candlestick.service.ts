import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick, ICandlestickConfig, ICandlestickValidations, ICandlestickStream } from "./interfaces";
import { environment, SYMBOLS } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { IBinanceService, IBinanceCandlestick } from "../binance";
import BigNumber from "bignumber.js";
import * as moment from 'moment';
import { BehaviorSubject } from "rxjs";


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
        table: 'candlesticks'
    };

    // Forecast Candlestick Configuration
    public readonly forecastConfig: ICandlestickConfig = {
        intervalMinutes: 30,
        alias: '30m',
        table: 'forecast_candlesticks'
    };

    // Candlestick Syncing Interval
    private readonly syncIntervalSeconds: number = 10;


    // Test & Debug Modes
    private readonly testMode: boolean = environment.testMode;
    private readonly debugMode: boolean = environment.debugMode;


    // Real Time Candlesticks Stream
    private streamInterval: any;
    private readonly streamSyncSecondsTolerance: number = 60;
    public readonly stream: BehaviorSubject<ICandlestickStream> = new BehaviorSubject({lastUpdate: 0, candlesticks: []});



    
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
        // Perform the first sync persistently to prevent a server crash
        try { this.broadcastStream(await this.syncCandlesticks()) } 
        catch (e) {
            console.log('Initial Candlestick Sync Failed', e);
            await this._utils.asyncDelay(5);
            this.broadcastStream(await this.syncCandlesticks());
        }
        

        // Initialize the interval
        this.streamInterval = setInterval(async () => { 
            try { this.broadcastStream(await this.syncCandlesticks()) } 
            catch(e) { 
                console.log(`Failed to sync the Candlesticks, attempting again in a few seconds:`, e);
                await this._utils.asyncDelay(5);
                try { this.broadcastStream(await this.syncCandlesticks()) } 
                catch (e) {
                    console.log(`Failed to sync the candlesticks again, will attempt again in a few seconds:`, e);
                    this.broadcastStream([], e);
                }
            }
         }, this.syncIntervalSeconds * 1000);
    }






    /**
     * Clears the stream interval if it has been set and therefore,
     * stop syncing candlesticks.
     * @returns void
     */
    public stopSync(): void { if (this.streamInterval) clearInterval(this.streamInterval) }














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
        let candlestick: ICandlestick|undefined;
        let last: ICandlestick[];
        let remaining: boolean = true;
        
        // Iterate as long as there are candlesticks to insert/update
        while (remaining) {
            // Retrieve the last stored candlestick 
            last = await this.getLast(true, 1);

            // Retrieve a syncable candlestick if any
            candlestick = await this.getSyncableForecastCandlestick(last[0]);

            // Check if a candlestick was found. If so, insert/update it
            if (candlestick) await this.saveCandlesticks([candlestick], true);

            // If a candlestick was found, continue the iteration
            remaining = candlestick != undefined;
        }
     }






     /**
      * Retrieves the forecast candlestick that has to be inserted or updated.
      * If it returns undefined, it means the forecase candlesticks are in sync.
      * @param last
      * @returns Promise<ICandlestick|undefined>
      */
    private async getSyncableForecastCandlestick(last: ICandlestick|undefined): Promise<ICandlestick|undefined> {
        // Calculate the initial times
        let openTime: number = last ? last.ot: this._binance.candlestickGenesisTimestamp;
        let closeTime: number = this.getForecastCandlestickCloseTime(openTime);

        // Retrieve the initial 1m candlesticks for the given interval and merge them if any
        let candlesticks1m: ICandlestick[] = await this.get(openTime, closeTime);
        let candlestick: ICandlestick|undefined = candlesticks1m.length ? this.mergeCandlesticks(candlesticks1m): undefined;

        // Check if there are candlesticks ahead
        let hasCandlesticksAhead: boolean = await this.hasCandlesticksAhead(closeTime);

        // There is an existing candlestick in the db. Handle the case accordingly
        if (last && candlestick) {
            /**
             * THE LAST CANDLESTICK IS COMPLETE
             * Since there could be candlesticks missing, it needs to iterate through intervals 
             * until the next candlestick is found.
             */
            if (last.ct == closeTime) {
                /**
                 * Update the last candlestick to make sure it has the last close price snapshot before moving to 
                 * the next candlestick. Also ensure the merged candlestick has correct open & close timestamps.
                 */
                await this.updateForecastCandlestick(last, candlestick);

                // If there are candlesticks ahead, iterate until the next one is found
                if (hasCandlesticksAhead) {
                    let candlestickFound: boolean = false;
                    while (!candlestickFound) {
                        // Initialize the new candlestick's times
                        openTime = closeTime + 1;
                        closeTime = this.getForecastCandlestickCloseTime(openTime);
    
                        // Download the candlesticks for the next interval
                        candlesticks1m = await this.get(openTime, closeTime);
    
                        // If candlesticks were found, 
                        if (candlesticks1m.length) {
                            // Merge the 1m candlesticks
                            candlestick = this.mergeCandlesticks(candlesticks1m);
    
                            // End the iteration
                            candlestickFound = true;
                        }
                    }
                }

                // Otherwise, the candlesticks are in sync
                else { candlestick = undefined }
            }

            /* THE LAST CANDLESTICK IS INCOMPLETE */

            /**
             * If there are no candlesticks ahead and the last candlestick is the same as the 
             * freshly downloaded one, means the candlesticks are in sync.
             */
            else if (!hasCandlesticksAhead && last.ct == candlestick.ct) { 
                // Make sure the candlestick has the latest snapshot before ending the iteration.
                await this.updateForecastCandlestick(last, candlestick);
                candlestick = undefined;
            }

            /**
             * If there are candlesticks ahead and the freshly downloaded candlestick's close time 
             * is less than the real close time means there are candlesticks missings. In order to 
             * move on, set the real close time on the candlestick.
             */
            else if (hasCandlesticksAhead && candlestick.ct < closeTime) { candlestick.ct = closeTime }
        }


        /**
         * GENESIS CANDLESTICK
         * If the close time does not match the real close time and there are candlesticks ahead, 
         * use the real close time instead.
         */
        else if (!last && candlestick && hasCandlesticksAhead && candlestick.ct < closeTime) candlestick.ct = closeTime;


        /**
         * OPEN AND CLOSE TIMES ADJUSTMENTS
         * As there are many discrepancies in the Candlestick API from Binance's end, 
         * in order to have perfect intervals, the open and close times need to always
         * add up perfectly.
         */
        if (candlestick) {
            // Set the correct open time
            candlestick.ot = openTime;

            // The close time cannot be greater than the calculated one
            if (candlestick.ct > closeTime) candlestick.ct = closeTime;
        }

        // Return the syncable candlestick if any
        return candlestick;
     }







    /**
     * Checks if there are 1 minute candlesticks ahead from a given close time.
     * This functionality is used to identify when Binance had interruptions and
     * missed 1 minute candlesticks.
     * @param realCloseTime 
     * @returns Promise<boolean>
     */
    private async hasCandlesticksAhead(realCloseTime: number): Promise<boolean> {
        const futureCandlesticks1m: ICandlestick[] = await this.get(realCloseTime, undefined, 1);
        return futureCandlesticks1m.length > 0;
    }







    /**
     * Given the last candlestick and the latest merge, it updates it in order to 
     * prevent the loss of existing snapshots.
     * @param last 
     * @param lastMerge 
     * @returns Promise<void>
     */
    private async updateForecastCandlestick(last: ICandlestick, lastMerge: ICandlestick): Promise<void> {
        lastMerge.ot = last.ot;
        lastMerge.ct = last.ct;
        await this.saveCandlesticks([lastMerge], true);
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













    /* Stream */








    /**
     * Given a list of candlesticks, it will broadcast a stream.
     * @param candlesticks 
     * @param error?
     * @returns void
     */
    private broadcastStream(candlesticks: ICandlestick[], error?: any): void {
        this.stream.next({
            lastUpdate: Date.now(),
            candlesticks: candlesticks,
            error: error ? this._utils.getErrorMessage(error): undefined
        });
    }









    /**
     * Verifies if a stream is currently in sync. It will check the last update 
     * and the last candlestick's close times to make sure they are within the
     * established tolerance.
     * @param stream 
     * @returns boolean
     */
     public isStreamInSync(stream: ICandlestickStream): boolean {
        // Make sure there are candlesticks
        if (!stream || !stream.candlesticks || !stream.candlesticks.length) return false;

        // Calculate the minimum acceptable timestamp
        const min: number = moment(Date.now()).subtract(this.streamSyncSecondsTolerance, "seconds").valueOf();

        // Make sure the last update is in sync
        if (stream.lastUpdate < min) return false;

        // Make sure the last candlestick is in sync
        if (stream.candlesticks.at(-1).ct < min) return false;

        // Otherwise, the stream is in sync
        return true;
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
            return this.testMode ? this._db.getTestTableName(this.forecastConfig.table): this.forecastConfig.table;
        } else {
            return this.testMode ? this._db.getTestTableName(this.standardConfig.table): this.standardConfig.table;
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