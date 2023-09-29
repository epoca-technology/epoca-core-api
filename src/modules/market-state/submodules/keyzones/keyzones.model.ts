import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IApiErrorService } from "../../../api-error";
import { IDatabaseService } from "../../../database";
import { 
    IKeyZoneStateEvent,
    IKeyZonesConfiguration,
    IKeyZonesModel,
} from "./interfaces";




@injectable()
export class KeyZonesModel implements IKeyZonesModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;





    constructor() {}





    /************************************
     * KeyZones Event Record Management *
     ************************************/






    /**
     * Retrieves the list of KeyZones Events by a given date range.
     * @param startAt 
     * @param endAt 
     * @returns Promise<IKeyZoneStateEvent[]>
     */
    public async listKeyZoneEvents(startAt: number, endAt: number): Promise<IKeyZoneStateEvent[]> {
        // Execute the query
        const { rows } = await this._db.query({ 
            text: `
                SELECT * FROM ${this._db.tn.keyzones_events}  
                WHERE t BETWEEN $1 AND $2 ORDER BY t ASC;
            `, 
            values: [startAt, endAt]
        });

        // Finally, return the result of the query
        return rows;
    }





    /**
     * Saves a KeyZone Event into the database safely.
     * @param evt 
     * @returns Promise<void>
     */
    public async saveKeyZoneEvent(evt: IKeyZoneStateEvent): Promise<void> {
        try {
            await this._db.query({
                text: `
                    INSERT INTO ${this._db.tn.keyzones_events}(k, kz, t, e, pl) 
                    VALUES ($1, $2, $3, $4, $5)
                `,
                values: [evt.k, evt.kz, evt.t, evt.e, evt.pl]
            });
        } catch (e) {
            console.log(e);
            this._apiError.log("KeyZonesModel.saveKeyZoneEvent", e);
        }
    }














    /*************************************
     * KeyZones Configuration Management *
     *************************************/





    /**
     * Retrieves the KeyZones' Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IKeyZonesConfiguration|undefined>
     */
    public async getConfigurationRecord(): Promise<IKeyZonesConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.keyzones_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the KeyZones' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    public async createConfigurationRecord(
        defaultConfiguration: IKeyZonesConfiguration
    ): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.keyzones_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the KeyZones' Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfigurationRecord(newConfiguration: IKeyZonesConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.keyzones_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }
}