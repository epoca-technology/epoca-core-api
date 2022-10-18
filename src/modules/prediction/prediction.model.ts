import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IPrediction } from "../epoch-builder";
import { IPredictionModel } from "./interfaces";




@injectable()
export class PredictionModel implements IPredictionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                  private _db: IDatabaseService;





    constructor() {}




    /* Retrievers */





    /**
     * Queries the predictions based on the provided params.
     * @param epochID 
     * @param limit 
     * @param startAt 
     * @param endAt 
     * @returns Promise<IPrediction[]>
     */
    public async listPredictions(
        epochID: string, 
        limit: number, 
        startAt: number|undefined, 
        endAt: number|undefined
    ): Promise<IPrediction[]> {
        // Init the query values
        let sql: string = "";
        let values: Array<string|number> = [epochID];

        // Init the query
        sql += `SELECT t, r, f, s FROM ${this._db.tn.predictions} WHERE epoch_id = $1 `;

        // Check if the starting point was provided
        if (typeof startAt == "number") {
            sql += "AND t < $2 ORDER BY t DESC LIMIT $3;";
            values.push(startAt);
        }

        // Check if the ending point was provided
        else if (typeof endAt == "number") {
            sql += "AND t > $2 ORDER BY t DESC LIMIT $3;";
            values.push(endAt);
        }

        // Otherwise, just complete the query with the order and limit
        else { sql += "ORDER BY t DESC LIMIT $2;" }

        // Add the limit to the values list
        values.push(limit);

        // Execute the query
        const { rows } = await this._db.query({ text: sql, values: values});

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
}