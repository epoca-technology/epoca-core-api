import {inject, injectable} from "inversify";
import { ICandlestickService, ICandlestick } from "./interfaces";
import { SYMBOLS } from "../../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IBinanceService, IBinanceCandlestick } from "../binance";
import { ICryptoCurrencySymbol, ICryptoCurrencyService } from "../cryptocurrency";
import BigNumber from "bignumber.js";



@injectable()
export class CandlestickService implements ICandlestickService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.CryptoCurrencyService)              private _cCurrency: ICryptoCurrencyService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;



    // Test Mode
    public testMode: boolean = false;




    constructor() {}







    /* Candlestick Retrievers */



    
    /**
     * Retrieves all candlesticks within 2 periods. If none of the periods are provided,
     * it will return all the candlesticks.
     * @param symbol 
     * @param start? 
     * @param end? 
     * @returns 
     */
    public async get(symbol: ICryptoCurrencySymbol, start?: number, end?: number): Promise<ICandlestick[]> {
        // Init the sql values
        let sql: string = `
            SELECT ot, ct, o, h, l, c, v, tbv
            FROM ${this.testMode ? 'test_1m_candlesticks': '1m_candlesticks'}
            WHERE s = ?
        `;
        let values: any[] = [symbol];

        // Check if both timestamps have been provided
        if (typeof start == "number" && typeof end == "number") {
            sql += ' AND ot >= ? AND ot <= ?';
            values.push(start);
            values.push(end);
        }

        // If only the start is provided
        else if (typeof start == "number") {
            sql += ' AND ot >= ?';
            values.push(start);
        }

        // If only the start is provided
        else if (typeof end == "number") {
            sql += ' AND ot <= ?';
            values.push(end);
        }

        // Retrieve the candlesticks
        return await this._db.query({
            sql: sql,
            values: values
        });
    }











    /**
     * Given a symbol, it will retrieve the open time of the last candlestick stored.
     * If none is found, it will return the genesis candlestick timestamp.
     * @param symbol
     * @returns Promise<number>
     */
    public async getLastOpenTimestamp(symbol: ICryptoCurrencySymbol): Promise<number> {
        // Retrieve the last candlestick open item
        const openTime: {ot: number}[] = await this._db.query({
            sql: `SELECT ot FROM ${this.testMode ? 'test_1m_candlesticks': '1m_candlesticks'} WHERE s = ? ORDER BY ot DESC LIMIT 1`,
            values: [symbol]
        });

        // If no results were found, return the symbol's genesis open time
        return openTime.length > 0 ? openTime[0].ot: this._cCurrency.data[symbol].genesisCandlestick;
    }











    /**
     * Retrieves the latest candlesticks based on the limit provided.
     * @param symbol 
     * @param limit? 
     * @returns Promise<ICandlestick[]>
     */
    public async getLast(symbol: ICryptoCurrencySymbol, limit?: number): Promise<ICandlestick[]> {
        // Init the limit
        limit = typeof limit == "number" ? limit: 1000;

        // Retrieve the candlesticks
        const candlesticks: ICandlestick[] = await this._db.query({
            sql: `
                SELECT ot, ct, o, h, l, c, v, tbv
                FROM ${this.testMode ? 'test_1m_candlesticks': '1m_candlesticks'}
                WHERE s = ?
                ORDER BY ot DESC
                LIMIT ?
            `,
            values: [symbol, limit]
        });

        // Return the reversed candlesticks
        return candlesticks.reverse();
    }

    
    







    /* Candlestick Syncing & Saving */









    /**
     * Retrieves the candlesticks starting at the provided point and stores them in the DB.
     * If the starting point is not the genesis, it will add 1 to the time in order to prevent
     * a duplicate record.
     * @param symbol 
     * @param startTimestamp 
     * @returns Promise<ICandlestick[]>
     */
     public async saveCandlesticksFromStart(symbol: ICryptoCurrencySymbol, startTimestamp: number): Promise<ICandlestick[]> {
        // Init the timestamp
        startTimestamp = startTimestamp == this._cCurrency.data[symbol].genesisCandlestick ? startTimestamp: startTimestamp + 1;

        // Retrieve the last 1k candlesticks from Binance
        const bCandlesticks: IBinanceCandlestick[] = await this._binance.getCandlesticks(symbol, '1m', startTimestamp, undefined, 1000);

        // Make sure new records were extracted
        if (bCandlesticks && bCandlesticks.length) {
            // Process them
            const processed: ICandlestick[] = this.processBinanceCandlesticks(symbol, bCandlesticks);

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
     * @returns Promise<any>
     */
    public async saveCandlesticks(candlesticks: ICandlestick[]): Promise<any> {
        // Prepare the values to be saved
        let values: any[] = [];
        for (let c of candlesticks) { values.push([c.ot, c.ct, c.o, c.h, c.l, c.c, c.v, c.tbv, c.s]) }

        // Insert them into the db
        return await this._db.query({
            sql: `INSERT INTO ${this.testMode ? 'test_1m_candlesticks': '1m_candlesticks'} (ot, ct, o, h, l, c, v, tbv, s) VALUES ?`, 
            values: [values]
        });
    }









    /* Helpers */











    /* Candlestick Interval Alteration */






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
            h: '',     // Placeholder
            l: '',     // Placeholder
            c: candlesticks[candlesticks.length - 1].c,
            v: '',     // Placeholder
            tbv: ''    // Placeholder
        };

        // Init the high & low lists
        let high: string[] = [];
        let low: string[] = [];

        // Init the volume accumulators
        let v: BigNumber = new BigNumber(0);
        let tbv: BigNumber = new BigNumber(0);

        // Iterate over each candlestick
        candlesticks.forEach((c) => {
            // Append the highs and the lows to the lists
            high.push(c.h);
            low.push(c.l);

            // Accumulate the volumes
            v = v.plus(c.v);
            tbv = tbv.plus(c.tbv);
        });

        // Set the highest high and the lowest low
        final.h = String(BigNumber.max.apply(null, high));
        final.l = String(BigNumber.min.apply(null, low));

        // Set the volume accumulation result
        final.v = v.toString();
        final.tbv = tbv.toString();

        // Return the final candlestick
        return final;
    }
















    /* Candlesticks Proccessors */






    /**
     * Given a list of binance candlesticks, it will convert them into the correct format
     * in order to be stored in the db.
     * @param symbol 
     * @param candlesticks 
     * @returns ICandlestick[]
     */
    public processBinanceCandlesticks(symbol: ICryptoCurrencySymbol, candlesticks: IBinanceCandlestick[]): ICandlestick[] {
        // Init the list
        let list: ICandlestick[] = [];

        // Iterate over each candlestick and convert it into the proper format
        for (let c of candlesticks) {
            list.push({
                ot: c[0],
                ct: c[6],
                o: <string>this._utils.outputNumber(c[1], {decimalPlaces: 2}),
                h: <string>this._utils.outputNumber(c[2], {decimalPlaces: 2}),
                l: <string>this._utils.outputNumber(c[3], {decimalPlaces: 2}),
                c: <string>this._utils.outputNumber(c[4], {decimalPlaces: 2}),
                v: <string>this._utils.outputNumber(c[7], {decimalPlaces: 2}),
                tbv: <string>this._utils.outputNumber(c[10], {decimalPlaces: 2}),
                s: symbol
            });
        }

        // Return the final list
        return list;
    }
}