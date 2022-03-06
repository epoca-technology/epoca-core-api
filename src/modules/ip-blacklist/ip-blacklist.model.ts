import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IIPBlacklistModel, IIPBlacklistRecord } from "./interfaces";




@injectable()
export class IPBlacklistModel implements IIPBlacklistModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;




    constructor() {}







    /* Retrievers */






    /**
     * Retrieves all the IP Blacklist records ordered by creation timestamp descending.
     * @returns Promise<IIPBlacklistRecord[]>
     */
     public async getAll(): Promise<IIPBlacklistRecord[]> {
        // Retrieve all the users
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.ip_blacklist} ORDER BY c DESC`,
            values: []
        });

        // Return the list
        return rows;
    }








    /**
     * Retrieves an IP Blacklist record. If the record does not exist it returns undefined.
     * @param ip 
     * @returns Promise<IIPBlacklistRecord|undefined>
     */
     public async get(ip: string): Promise<IIPBlacklistRecord|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.ip_blacklist} WHERE ip = $1`,
            values: [ip]
        });

        // Return the result
        return rows[0];
    }







    /* IP Management */







    /**
     * Registers an IP Blacklist record in the database.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async registerIP(ip: string, notes: string|undefined): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.ip_blacklist}(ip, n, c) 
                VALUES ($1, $2, $3)
            `,
            values: [ip, notes, Date.now()]
        });
    }
    






    /**
     * Updates the notes for an IP Blacklist record.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async updateNotes(ip: string, notes: string): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.ip_blacklist} SET n = $1 WHERE ip = $2`,
            values: [notes, ip]
        });
    }






    

    /**
     * Removes an IP from the database.
     * @param ip 
     * @returns Promise<void>
     */
    public async unregisterIP(ip: string): Promise<void> {
        await this._db.query({
            text: `DELETE FROM ${this._db.tn.ip_blacklist} WHERE ip = $1`,
            values: [ip]
        });
    }
}