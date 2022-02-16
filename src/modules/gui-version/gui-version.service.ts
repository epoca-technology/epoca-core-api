import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IUtilitiesService } from "../utilities";
import { IGuiVersionService } from "./interfaces";




@injectable()
export class GuiVersionService implements IGuiVersionService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;

    // Default Version - Inserted when no data is available
    private readonly defaultVersion: string = '0.0.1';


    constructor() {}







    /**
     * Retrieves the current GUI version. Initializes the data in case it 
     * hadn't been.
     * @returns Promise<string>
     */
    public async get(): Promise<string> {
        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // Retrieve the current version if any
            const {rows}: IQueryResult = await client.query({
                text: `SELECT version FROM ${this._db.tn.gui_version} WHERE id=1`,
                values: []
            });

            // If there is a record in the db, return it
            if (rows.length && typeof rows[0].version == "string") {
                return rows[0].version;
            }

            // Otherwise, store and return the default version
            else {
                // Store the default version in the db
                await client.query({
                    text: `INSERT INTO ${this._db.tn.gui_version}(id, version) VALUES(1, $1)`,
                    values: [this.defaultVersion]
                });

                // Finally, return it
                return this.defaultVersion;
            }
        } finally { client.release() }
    }










    /**
     * Validates and updates the current GUI Version.
     * @param newVersion
     * @returns Promise<void>
     */
    public async update(newVersion: string): Promise<void> {
        // Make sure the provided version is valid
        if (
            typeof newVersion != "string" ||
            newVersion.length < 5 ||
            newVersion.length > 15 ||
            newVersion.split('.').length != 3
        ) {
            throw new Error(this._utils.buildApiError(`The provided version (${newVersion}) has an invalid format.`, 7000));
        }

        // Perform the update
        await this._db.query({
            text: `UPDATE ${this._db.tn.gui_version} SET version=$1 WHERE id=1`,
            values: [newVersion]
        });
    }
}