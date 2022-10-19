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
     * @param startAt 
     * @param endAt 
     * @param limit 
     * @returns Promise<IPrediction[]>
     */
    public async listPredictions(
        epochID: string, 
        startAt: number|undefined, 
        endAt: number|undefined,
        limit: number|undefined
    ): Promise<IPrediction[]> {
        // Init the query values
        let sql: string = `SELECT t, r, f, s FROM ${this._db.tn.predictions} WHERE epoch_id = $1 `;
        let values: Array<string|number> = [epochID];

        // Check if the starting point was provided
        if (typeof startAt == "number" && endAt == undefined) {
            sql += "AND t < $2 ORDER BY t DESC LIMIT $3;";
            values.push(startAt);
            values.push(limit);
        }

        // Check if the ending point was provided
        else if (startAt == undefined && typeof endAt == "number") {
            sql += "AND t > $2 ORDER BY t DESC LIMIT $3;";
            values.push(endAt);
            values.push(limit);
        }

        // Otherwise, both start and ending point were provided
        else {
            sql += "AND t BETWEEN $2 AND $3 ORDER BY t DESC;";
            values.push(startAt);
            values.push(endAt);
        }

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