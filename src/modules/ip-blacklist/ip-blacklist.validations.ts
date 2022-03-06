import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { IIPBlacklistModel, IIPBlacklistValidations, IIPBlacklistRecord } from "./interfaces";




@injectable()
export class IPBlacklistValidations implements IIPBlacklistValidations {
    // Inject dependencies
    @inject(SYMBOLS.IPBlacklistModel)                   private _model: IIPBlacklistModel;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                 private _validations: IValidationsService;




    constructor() {}







    /**
     * Checks if an IP can be registered, throws an error otherwise.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async canRegisterIP(ip: string, notes: string|undefined): Promise<void> {
        // Make sure the IP is valid
        if (!this._validations.ipValid(ip)) {
            throw new Error(this._utils.buildApiError(`The provided IP has an invalid format: ${ip}`, 11300));
        }

        // Make sure the notes are valid if provided
        if (notes !== undefined && !this._validations.ipNotesValid(notes)) {
            throw new Error(this._utils.buildApiError(`If the notes are provided, they must be valid: ${notes}`, 11301));
        }

        // Make sure the IP hasn't already been blacklisted
        const record: IIPBlacklistRecord = await this._model.get(ip);
        if (record) {
            throw new Error(this._utils.buildApiError(`The IP you are trying to blacklist is already registered: ${ip}`, 11302));
        }
    }

    





    /**
     * Checks if the notes for an IP can be updated, throws an error otherwise.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async canUpdateNotes(ip: string, notes: string): Promise<void> {
        // Make sure the IP is valid
        if (!this._validations.ipValid(ip)) {
            throw new Error(this._utils.buildApiError(`The provided IP has an invalid format: ${ip}`, 11300));
        }

        // Make sure the notes are valid
        if (!this._validations.ipNotesValid(notes)) {
            throw new Error(this._utils.buildApiError(`The provided notes are invalid: ${notes}`, 11301));
        }

        // Make sure the IP exists
        const record: IIPBlacklistRecord = await this._model.get(ip);
        if (!record) {
            throw new Error(this._utils.buildApiError(`The IP you are trying to update the notes for does not exist: ${ip}`, 11303));
        }
    }






    /**
     * Checks if an IP can be unregistered, throws an error otherwise.
     * @param ip 
     */
    public async canUnregisterIP(ip: string): Promise<void> {
        // Make sure the IP is valid
        if (!this._validations.ipValid(ip)) {
            throw new Error(this._utils.buildApiError(`The provided IP has an invalid format: ${ip}`, 11300));
        }

        // Make sure the IP exists
        const record: IIPBlacklistRecord = await this._model.get(ip);
        if (!record) {
            throw new Error(this._utils.buildApiError(`The IP you are trying to unregister does not exist: ${ip}`, 11303));
        }
    }
}