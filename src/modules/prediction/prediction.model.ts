import {inject, injectable} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IDatabaseService, IPoolClient } from "../database";
import { IPrediction } from "../epoch-builder";
import { IPredictionCandlestick, IPredictionModel } from "./interfaces";




@injectable()
export class PredictionModel implements IPredictionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                  private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;



    // The interval in which the candlesticks are built
    public readonly candlesticksIntervalMinutes: number = 15;




    constructor() {}











    /**************
     * Retrievers *
     **************/









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
                SELECT ot, ct, o, h, l, c FROM ${this._db.tn.epoch_prediction_candlesticks} WHERE epoch_id = $1 
                AND ot BETWEEN $2 AND $3 ORDER BY ot ASC;
            `, 
            values: [epochID, startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
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









    










    /*********
     * Saver *
     *********/










    /**
     * Saves a prediction record and also manages the candlesticks.
     * @param epochID 
     * @param pred 
     * @param activeCandle 
     * @param newCandle 
     * @returns Promise<void>
     */
    public async savePrediction(
        epochID: string, 
        pred: IPrediction,
        activeCandle: IPredictionCandlestick|undefined, 
        newCandle: IPredictionCandlestick|undefined
    ): Promise<void> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Save the prediction record
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.predictions}(t, epoch_id, r, f, s) 
                    VALUES ($1, $2, $3, $4, $5)
                `,
                values: [pred.t, epochID, pred.r, JSON.stringify(pred.f), pred.s]
            });

            // Update the active candlestick (if any) - The open sum & open time don"t need to be updated
            if (activeCandle) {
                await client.query({ 
                    text: `
                        UPDATE ${this._db.tn.epoch_prediction_candlesticks} SET ct=$1, h=$2, l=$3, c=$4 
                        WHERE epoch_id = $5 AND ot=$6
                    `,
                    values: [activeCandle.ct, activeCandle.h, activeCandle.l, activeCandle.c, epochID, activeCandle.ot]
                });
            }

            // Insert the new candlestick (if any)
            if (newCandle) {
                await client.query({
                    text: `
                        INSERT INTO ${this._db.tn.epoch_prediction_candlesticks}(epoch_id, ot, ct, o, h, l, c) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                    `,
                    values: [epochID, newCandle.ot, newCandle.ct, newCandle.o, newCandle.h, newCandle.l, newCandle.c]
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
}