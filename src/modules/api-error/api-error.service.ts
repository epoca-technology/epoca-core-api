import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { IApiErrorService, IApiError } from "./interfaces";




@injectable()
export class ApiErrorService implements IApiErrorService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;

    // Sensible Data Keys
    private readonly sensitiveDataKeys: string[] = ['password', 'newPassword'];

    // Ommit Errors
    private readonly ommitErrors: number[] = [
        11000,  // IPBlacklistService: The IP ${ip} is currently blacklisted and therefore cannot interact with the API.
        8304,   // AuthModel: The ID Token has expired. Please generate a new one and try again.
        8302,   // AuthModel: The provided OTP token (${otpToken}) is invalid or no longer active for uid: ${uid}.
        9004,   // ApiSecretService: The uid (${uid}) provided an api secret that didnt match the one stored locally: ${secret}.
        12001,  // The API cannot accept requests because it has not yet been initialized.
    ]

    constructor() {}





    /* Retrievers */




    /**
     * Retrieves the full list of API Errors ordered by creation descending.
     * @returns Promise<IApiError[]>
     */
    public async getAll(): Promise<IApiError[]> {
        // Retrieve all the users
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.api_errors} ORDER BY c DESC`,
            values: []
        });

        // Return the list
        return rows;
    }









    /* Logger */




    /**
     * Saves an API Error into the Database safely. Waiting for this promise to resolve
     * is not neccessary.
     * @param origin 
     * @param error 
     * @param uid? 
     * @param ip? 
     * @param params? 
     * @returns Promise<void>
     */
    public async log(origin: string, error: string|object, uid?: string, ip?: string, params?: object): Promise<void> {
        try {
            // Init values
            error = this._utils.getErrorMessage(error);
            const code: number = this._utils.getCodeFromApiError(error);
            params = this.getParams(params);

            // Save the error if it shouldnt be ommited
            if (!this.ommitErrors.includes(code)) await this.saveAPIError(origin, error, uid, ip, params);
        } catch (e) {
            console.log(`There was an error when logging an API Error: `, e);
        }
    }






    /**
     * Inserts an API Error into the Database.
     * @param origin 
     * @param errorMessage 
     * @param uid 
     * @param ip 
     * @param params 
     * @returns Promise<void>
     */
    private async saveAPIError(origin: string, errorMessage: string, uid?: string, ip?: string, params?: object): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.api_errors}(o, e, c, uid, ip, p) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `,
            values: [origin, errorMessage, Date.now(), uid, ip, params]
        });
    }







    /**
     * Given a params object, it will check the keys and replace any sensible
     * data it may find.
     * @param params 
     * @returns object|undefined
     */
    private getParams(params: object): object|undefined {
        // Check if a proper params object has been provided
        if (params && typeof params == "object") {
            // Init the keys
            const keys: string[] = Object.keys(params);

            // Make sure it isn't an empty object
            if (!keys.length) return undefined;

            // Iterate over each param key and hide sensitive values
            for (let key of keys) {
                if (this.sensitiveDataKeys.includes(key)) params[key] = '[SENSITIVE_DATA_HIDDEN]';
            }

            // Finally, return the new params object
            return params;
        } else {
            return undefined;
        }
    }







    /* Cleaner */





    /**
     * Deletes all the API Errors currently stored in the database.
     * @returns Promise<void>
     */
    public async deleteAll(): Promise<void> {
        await this._db.query({
            text: `DELETE FROM ${this._db.tn.api_errors}`,
            values: []
        });
    }
}