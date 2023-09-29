import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IDatabaseService } from "../../../database";
import { IWindowModel, IWindowStateConfiguration } from "./interfaces";




@injectable()
export class WindowModel implements IWindowModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;






    constructor() { }







    /**
     * Retrieves the Window's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IWindowStateConfiguration|undefined>
     */
    public async getConfigurationRecord(): Promise<IWindowStateConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.window_state_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }







    /**
     * Creates the Window' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    public async createConfigurationRecord(
        defaultConfiguration: IWindowStateConfiguration
    ): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.window_state_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    

    /**
     * Updates the Window's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfigurationRecord(
        newConfiguration: IWindowStateConfiguration
    ): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.window_state_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }
}