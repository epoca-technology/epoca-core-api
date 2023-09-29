import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IDatabaseService } from "../../../database";
import { ILiquidityConfiguration, ILiquidityModel } from "./interfaces";




@injectable()
export class LiquidityModel implements ILiquidityModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;



    constructor() {}





    /**
     * Retrieves the Liquidity's Configuration from the db. If there is no record, 
     * it returns undefined.
     * @returns Promise<ILiquidityConfiguration|undefined>
     */
    public async getConfigurationRecord(): Promise<ILiquidityConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.liquidity_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Liquidity's Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    public async createConfigurationRecord(
        defaultConfiguration: ILiquidityConfiguration
    ): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.liquidity_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Liquidity's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfigurationRecord(newConfiguration: ILiquidityConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.liquidity_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }
}