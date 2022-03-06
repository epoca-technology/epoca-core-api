import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IIPBlacklistService, IIPBlacklist, IIPBlacklistModel, IIPBlacklistRecord, IIPBlacklistValidations } from "./interfaces";




@injectable()
export class IPBlacklistService implements IIPBlacklistService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)               private _utils: IUtilitiesService;
    @inject(SYMBOLS.IPBlacklistValidations)         private _validations: IIPBlacklistValidations;
    @inject(SYMBOLS.IPBlacklistModel)               private _model: IIPBlacklistModel;

    // IP Blacklist Object
    private blacklist: IIPBlacklist = {};


    constructor() {}



    /* Initialization */





    /**
     * Downloads all the IP Blacklist records and populates the local object.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Retrieve all the IP Blacklist records
        const records: IIPBlacklistRecord[] = await this._model.getAll();

        // Iterate over each record and build the local object
        records.forEach((r) => { this.blacklist[r.ip] = true });
    }













    /* Retrievers */





    /**
     * Retrieves a list of all the blacklisted ip records.
     * @returns Promise<IIPBlacklistRecord[]>
     */
    public getAll(): Promise<IIPBlacklistRecord[]> { return this._model.getAll() }














    /* IP Status */




    /**
     * Verifies if an IP is currently blacklisted. If so, it throws an error.
     * If the IP is not retrieved for whatever reason, this validation is 
     * bypassed.
     * @param ip
     * @returns void 
     */
    public isIPBlacklisted(ip: string): void {
        // Init values
        ip = this.formatIP(ip);

        // Make sure it is a valid string before proceeding
        if (typeof ip == "string" && ip.length && this.blacklist[ip]) {
            throw new Error(this._utils.buildApiError(`The IP ${ip} is currently blacklisted and therefore cannot interact with the API.`, 11000));
        }
    }













    /* IP Management */







    /**
     * Registers a new IP in the Blacklist. It also adds it to the local object.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async registerIP(ip: string, notes: string|undefined): Promise<void> {
        // Init values
        ip = this.formatIP(ip);
        notes = typeof notes == "string" && notes.length ? notes: undefined;

        // Validate the request
        await this._validations.canRegisterIP(ip, notes);

        // Save the record
        await this._model.registerIP(ip, notes);

        // Add the IP to the local object
        this.blacklist[ip] = true;
    }







    /**
     * Updates IP Notes.
     * @param ip 
     * @param notes 
     * @returns Promise<void>
     */
    public async updateNotes(ip: string, notes: string): Promise<void> {
        // Init values
        ip = this.formatIP(ip);

        // Validate the request
        await this._validations.canUpdateNotes(ip, notes);

        // Update the record
        await this._model.updateNotes(ip, notes);
    }








    /**
     * Unregisters an IP from the Blacklist. It also removes it from the local object.
     * @param ip 
     * @returns Promise<void>
     */
     public async unregisterIP(ip: string): Promise<void> {
        // Init values
        ip = this.formatIP(ip);

        // Validate the request
        await this._validations.canUnregisterIP(ip);

        // Remove the record
        await this._model.unregisterIP(ip);

        // Delete the IP from the local object
        delete this.blacklist[ip];
    }












    /* Misc Helpers */






    /**
     * Lowercases the IP and removes all whitespaces if any.
     * @param ip 
     * @returns string
     */
    public formatIP(ip: string): string { 
        if (typeof ip == "string" && ip.length) {
            return ip.toLowerCase().replace(/\s+/g, '');
        } else {
            return '';
        }
    }
}