import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IDatabaseService } from "../../../database";
import { ICoinsObject, ICoinsConfiguration, ICoinsModel } from "./interfaces";




@injectable()
export class CoinsModel implements ICoinsModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)            private _db: IDatabaseService;




    constructor() {}







    /********************************
     * Coin Installation Management *
     ********************************/




    /**
     * Retrieves the currently installed coins. If none has been installed
     * it returns undefined.
     * @returns Promise<ICoinsObject|undefined>
     */
    public async getInstalledCoins(): Promise<ICoinsObject|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.coins} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }






    /**
     * Creates the installed coins row. Only invoke this function
     * when the installed coins db record is undefined.
     * @param coins 
     * @returns Promise<void>
     */
    public async createInstalledCoins(coins: ICoinsObject): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.coins}(id, data) VALUES(1, $1)`,
            values: [coins]
        });
    }




    /**
     * Updates the currently installed coins.
     * @param coins 
     * @returns Promise<void>
     */
    public async updateInstalledCoins(coins: ICoinsObject): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.coins} SET data=$1 WHERE id=1`,
            values: [coins]
        });
    }















    /***********************************
     * Configuration Record Management *
     ***********************************/




    /**
     * Retrieves the Coins's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<ICoinsConfiguration|undefined>
     */
    public async getConfigurationRecord(): Promise<ICoinsConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.coins_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Coins' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    public async createConfigurationRecord(defaultConfiguration: ICoinsConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.coins_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Coins's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfigurationRecord(newConfiguration: ICoinsConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.coins_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }
}