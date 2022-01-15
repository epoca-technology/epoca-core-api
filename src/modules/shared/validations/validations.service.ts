import {injectable} from "inversify";
import { IValidationsService } from "./interfaces";
import { version as uuidVersion, validate as uuidValidate } from 'uuid';


@injectable()
export class ValidationsService implements IValidationsService {



    constructor() {}






















    /* Numbers */





    /**
     * Verifies if a number is valid and optionally meets a range.
     * @param value 
     * @param min 
     * @param max 
     * @returns boolean
     */
    public numberValid(value: number, min?: number, max?: number): boolean {
        if (typeof value != "number") { return false }
        else if (typeof min == "number" && value < min) { return false }
        else if (typeof max == "number" && value > max) { return false }
        else { return true }
    }





    





    /* UUID */





    /**
     * Validates a provided uuid. Also makes sure it matches the version used
     * in the Database
     * @param uuid 
     * @returns boolean
     */
     public uuidValid(uuid: string): boolean { return uuidValidate(uuid) && uuidVersion(uuid) === 4 }

}