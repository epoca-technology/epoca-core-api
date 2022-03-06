import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiSecretService, IApiSecretRecord, IApiSecrets } from "./interfaces";
import { IDatabaseService, IFanoutObject } from "../database";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { IApiErrorService } from "../api-error";
import * as moment from 'moment';




@injectable()
export class ApiSecretService implements IApiSecretService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                private _validations: IValidationsService;
    @inject(SYMBOLS.ApiErrorService)                   private _apiError: IApiErrorService;

    // Secret Duration Minutes
    private readonly secretDuration: number = 10;

    // Secrets Object
    private secrets: IApiSecrets = {};



    
    constructor() {}













    /* Secrets Management */






    /**
     * Refreshes the api secrets for a given list of uids. Once the fanout object has been stored,
     * it will also update the local secrets object.
     * @IMPORTANT: This function is also invoked when the Auth Module is initialized.
     * @param uids 
     * @returns Promise<void>
     */
    public async refreshSecrets(uids: string[]): Promise<void> {
        // Make sure a list of uids has been provided
        if (!Array.isArray(uids) || !uids.length) {
            throw new Error(this._utils.buildApiError('A list of valid uids must be provided in order to refresh the api secrets.', 9000));
        }

        // Build the fanout object
        let fanout: IFanoutObject = {};
        const ts: number = Date.now();
        for (let uid of uids) {
            fanout[uid] = <IApiSecretRecord> {
                s: this._utils.generatePassword({length: 10}),
                t: ts
            }
        }

        // Process the fanout
        await this.processFanoutPersistently(fanout);

        // Finally, update local values
        this.secrets = { ...this.secrets, ...fanout}
    }








    /**
     * Removes a secret from the db and from the local object.
     * @param uid 
     * @returns Promise<void>
     */
    public async removeSecret(uid: string): Promise<void> {
        // Build the fanout object
        let fanout: IFanoutObject = {};
        fanout[uid] = null;

        // Process the fanout
        await this.processFanoutPersistently(fanout);

        // Delete the secret from the local object
        delete this.secrets[uid];
    }












    /**
     * Attempts to process a fanout object in a persistent way.
     * @param fanout 
     * @returns Promise<void>
     */
    private async processFanoutPersistently(fanout: IFanoutObject): Promise<void> {
        try { await this._db.apiSecretRef.update(fanout) } 
        catch (e) {
            console.error('There was an error when processing the api secrets fanout (1). Attempting again in a few seconds', e);
            await this._utils.asyncDelay(7);
            try { await this._db.apiSecretRef.update(fanout) } 
            catch (e) {
                console.error('There was an error when processing the api secrets fanout (2). Attempting again in a few seconds', e);
                await this._utils.asyncDelay(7);
                await this._db.apiSecretRef.update(fanout);
            }
        }
    }













    /* Secret Verification */




    /**
     * Verifies if a user's secret exists and is valid. Otherwise, throws an error.
     * @param uid 
     * @param secret 
     * @returns Promise<void>
     */
    public async verifySecret(uid: string, secret: string): Promise<void> {
        // Make sure the uid is in the local object
        if (!this.secrets[uid]) {
            throw new Error(this._utils.buildApiError(`The uid (${uid}) was not found in the local secrets object.`, 9002));
        }

        // Make sure the provided secret has a valid format
        if (!this._validations.apiSecretValid(secret)) {
            throw new Error(this._utils.buildApiError(`The uid (${uid}) provided an api secret with an invalid format: ${secret}.`, 9003));
        }

        // Make sure the secrets match
        if (this.secrets[uid].s != secret) {
            throw new Error(this._utils.buildApiError(`The uid (${uid}) provided an api secret that didnt match the one stored locally: ${secret}.`, 9004));
        }

        // Check if the secret needs to be refreshed - If so, do it in safe mode
        if (this.secretExpired(this.secrets[uid].t)) {
            try {
                await this.refreshSecrets([uid]);
            } catch (e) {
                // Log the error
                console.error(`There was an error when refreshing the secret for ${uid}.`, e);

                // Save API Error
                this._apiError.log('ApiSecretService.verifySecret', e, uid, undefined, {secret: secret});
            }
        }
    }






    /**
     * Given a secret's timestamp, it will check if it has expired.
     * @param secretTimestamp 
     * @returns boolean
     */
    private secretExpired(secretTimestamp: number): boolean {
        const currentTS: number = Date.now();
        const expiry: number = moment(secretTimestamp).add(this.secretDuration, "minutes").valueOf();
        return currentTS >= expiry;
    }
}