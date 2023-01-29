import {inject, injectable} from "inversify";
import * as moment from "moment";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IPrediction } from "../epoch-builder";
import { IPredictionCandlestick, IPredictionModel } from "./interfaces";




@injectable()
export class PredictionModel implements IPredictionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                  private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;



    // The interval in which the candlesticks are built
    public readonly candlesticksIntervalMinutes: number = 30; // 30 Minutes




    constructor() {}






    /* Retrievers */





    /**
     * Queries the predictions based on the provided params and returns
     * them ordered by date ascending.
     * @param epochID 
     * @param startAt 
     * @param endAt
     * @returns Promise<IPrediction[]>
     */
    public async listPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPrediction[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT t, r, f, s FROM ${this._db.tn.predictions} WHERE epoch_id = $1 
                AND t BETWEEN $2 AND $3 ORDER BY t ASC;
            `, 
            values: [epochID, startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }






    /**
     * Queries the predictions based on the provided params and returns
     * them ordered by date ascending in a minified format.
     * @param epochID 
     * @param startAt 
     * @param endAt
     * @returns Promise<Partial<IPrediction>[]>
     */
    public async listMinifiedPredictions(
        epochID: string, 
        startAt: number, 
        endAt: number
    ): Promise<Partial<IPrediction>[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT t, s FROM ${this._db.tn.predictions} WHERE epoch_id = $1 
                AND t BETWEEN $2 AND $3 ORDER BY t ASC;
            `, 
            values: [epochID, startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }










    /* Prediction Saving */






    /**
     * Saves a prediction into the database so it can be visualized
     * through the GUI Later on.
     * @param epochID 
     * @param pred 
     * @returns Promise<void>
     */
    public async savePrediction(epochID: string, pred: IPrediction): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.predictions}(t, epoch_id, r, f, s) 
                VALUES ($1, $2, $3, $4, $5)
            `,
            values: [pred.t, epochID, pred.r, JSON.stringify(pred.f), pred.s]
        });
    }










    /* Prediction Candlesticks */






    /* Retrievers */








    /**
     * Queries the prediction candlesticks based on the provided params and returns
     * them ordered by date ascending.
     * @param epochID 
     * @param startAt 
     * @param endAt
     * @returns Promise<IPredictionCandlestick[]>
     */
     public async listPredictionCandlesticks(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPredictionCandlestick[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT ot, ct, o, h, l, c, sm FROM ${this._db.tn.epoch_prediction_candlesticks} WHERE epoch_id = $1 
                AND ot BETWEEN $2 AND $3 ORDER BY ot ASC;
            `, 
            values: [epochID, startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }







    /**
     * Retrieves the open time of the last candlestick stored.
     * If none is found, it will return the installation date of the epoch.
     * @param epochID
     * @param epochInstalled
     * @returns Promise<number>
     */
    public async getLastOpenTimestamp(epochID: string, epochInstalled: number): Promise<number> {
        // Retrieve the last candlestick open item
        const {rows}: IQueryResult = await this._db.query({
            text: `SELECT ot FROM ${this._db.tn.epoch_prediction_candlesticks} WHERE epoch_id = $1 ORDER BY ot DESC LIMIT 1`,
            values: [epochID]
        });

        // If no results were found, return the genesis open time
        return rows.length > 0 ? rows[0].ot: epochInstalled;
    }








    /**
     * Given a list of candlesticks, it will create or update them on the database.
     * @param epochID 
     * @param candlesticks 
     * @returns Promise<void>
     */
     public async savePredictionCandlesticks(epochID: string, candlesticks: IPredictionCandlestick[]): Promise<void> {
        // Save the candlesticks if any
        if (candlesticks && candlesticks.length) {
            // Initialize the client
            const client: IPoolClient = await this._db.pool.connect();
            try {
                // Begin the transaction
                await client.query({text: "BEGIN"});

                // Insert the candlesticks
                for (let c of candlesticks) {
                    // Check if the candlestick exists
                    const {rows}: IQueryResult = await client.query({
                        text: `SELECT ct FROM ${this._db.tn.epoch_prediction_candlesticks} WHERE epoch_id = $1 AND ot=$2`,
                        values: [epochID, c.ot]
                    });

                    // If the candlestick exists, update it - The open sum & open time don"t need to be updated
                    if (rows && rows.length) {
                        await client.query({
                            text: `
                                UPDATE ${this._db.tn.epoch_prediction_candlesticks} SET ct=$1, h=$2, l=$3, c=$4, sm=$5
                                WHERE epoch_id = $6 AND ot=$7
                            `,
                            values: [c.ct, c.h, c.l, c.c, c.sm, epochID, c.ot]
                        });
                    } 
                    
                    // Otherwise, create it
                    else {
                        await client.query({
                            text: `
                                INSERT INTO ${this._db.tn.epoch_prediction_candlesticks}(epoch_id, ot, ct, o, h, l, c, sm) 
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                            `,
                            values: [epochID, c.ot, c.ct, c.o, c.h, c.l, c.c, c.sm]
                        });
                    }
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
        } else {
            console.log(`Epoch Prediction Candlesticks: `, candlesticks);
            throw new Error(this._utils.buildApiError("A valid list of candlesticks is required in order to invoke savePredictionCandlesticks.", 22000));
        }
    }







    /* Misc Helpers */






    /**
     * Builds a candlestick based on a given list of predictions.
     * @param preds 
     * @returns IPredictionCandlestick
     */
    public buildCandlestick(preds: Partial<IPrediction>[]): IPredictionCandlestick {
        // Init the candlestick
        let final: IPredictionCandlestick = {
            ot: preds[0].t,
            ct: preds.at(-1).t,
            o: preds[0].s,
            h: 0,   // Placeholder
            l: 0,   // Placeholder
            c: preds.at(-1).s,
            sm: 0    // Placeholder
        };

        // Build a list with the sums alone
        const sums: number[] = preds.map((p) => p.s);

        // Calculate the rest of the required values
        final.h = <number>this._utils.outputNumber(BigNumber.max.apply(null, sums), {dp: 6});
        final.l = <number>this._utils.outputNumber(BigNumber.min.apply(null, sums), {dp: 6});
        final.sm = <number>this._utils.calculateAverage(sums, {dp: 6});

        // Return the final candlestick
        return final;
    }


    


    
    /**
     * Given the open time of a candlestick, it will calculate it"s close 
     * time based on the prediction config.
     * @param ot 
     * @returns number
     */
    public getPredictionCandlestickCloseTime(ot: number): number {
        return moment(ot).add(this.candlesticksIntervalMinutes, "minutes").subtract(1, "millisecond").valueOf();
    }
}