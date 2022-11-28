import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionModel, IPositionStrategy,
} from "./interfaces";




@injectable()
export class PositionModel implements IPositionModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)             private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;





    constructor() {}











    /*********************
     * Position Strategy *
     *********************/





    /**
     * Retrieves current position strategy. If none has been set,
     * it returns undefined
     * @returns Promise<IPositionStrategy|undefined>
     */
    public async getStrategy(): Promise<IPositionStrategy|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT strategy FROM  ${this._db.tn.position_strategy} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].strategy: undefined;
    }





    /**
     * Stores the default strategy.
     * @param strategy 
     * @returns Promise<void>
     */
    public async createStrategy(strategy: IPositionStrategy): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.position_strategy}(id, strategy) VALUES(1, $1)`,
            values: [strategy]
        });
    }






    /**
     * Updates the current strategy.
     * @param strategy 
     * @returns Promise<void>
     */
     public async updateStrategy(strategy: IPositionStrategy): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.position_strategy} SET strategy=$1 WHERE id=1`,
            values: [strategy]
        });
    }
}
