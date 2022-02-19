import {injectable} from "inversify";
import { IValidationsService } from "./interfaces";
import { version as uuidVersion, validate as uuidValidate } from 'uuid';
import { IAuthority } from "../auth";


@injectable()
export class ValidationsService implements IValidationsService {



    constructor() {}




    /* UUID */





    /**
     * Validates a provided uuid. Also makes sure it matches the version used
     * in the Database
     * @param uuid 
     * @returns boolean
     */
     public uuidValid(uuid: string): boolean { return uuidValidate(uuid) && uuidVersion(uuid) === 4 }







     





    /* Auth */






	
	/*
	* Verifies if an email has a valid format.
	* @param email
	* @returns boolean
	* */
	public emailValid(email: string): boolean {
        const regx: RegExp = /^(([^<>()\[\]\.,;:\s@\"]+(\.[^<>()\[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
		return typeof email == "string" && email.length >= 6 && email.length <= 150 && regx.test(email);
	}








	
	/*
	 * Verifies a password has a valid format. For a password to be valid it must contain:
     * - Minimum 8 characters
     * - Maximum 200 characters
     * - At least 1 uppercase letter
     * - At least 1 lowercase letter
     * - At least 1 number
	 * @param password
	 * @returns boolean
	 * */
	public passwordValid(password: string): boolean {
        // Perform basic validations
        if (typeof password == "string" && password.length >= 8 && password.length <= 200) {
            // Init regular expressions
            const anUpperCase: RegExp = /[A-Z]/;
            const aLowerCase: RegExp = /[a-z]/;
            const aNumber: RegExp = /[0-9]/;

            // Init the counters
            let numUpper: number = 0;
            let numLower: number = 0;
            let numNums: number = 0;

            // Iterate over each password character
            for (let i = 0; i < password.length; i++) {
                if(anUpperCase.test(password[i])) { numUpper++ }
                else if(aLowerCase.test(password[i])) { numLower++ }
                else if(aNumber.test(password[i])) { numNums++ }
            }

            // Make sure that at least one of each was found
            return numUpper > 0 && numLower > 0 && numNums > 0;
        } else { return false }
	}





	

	/*
	* Verifies an authority is valid.
	* @param authority
	* @param maxAuthority?
	* @returns boolean
	* */
	public authorityValid(authority: IAuthority, maxAuthority?: IAuthority): boolean {
        maxAuthority = typeof maxAuthority == "number" ? maxAuthority: 5;
		return typeof authority == "number" && authority >= 1 && authority <= maxAuthority;
	}









    /* API Secret */



    /**
     * Verifies if an API secret is valid.
     * @param secret 
     * @returns boolean
     */
    public apiSecretValid(secret: string): boolean { return typeof secret == "string" && secret.length == 10 }











    /* OTP Token */





    /**
     * Verifies if an OTP Token is valid.
     * @param token 
     * @returns boolean
     */
    public otpTokenValid(token: string): boolean { return typeof token == "string"  && /^[0-9]{6}$/.test(token) }













    /* Numbers */





    /**
     * Verifies if a number is valid and optionally meets a range.
     * @param value 
     * @param min? 
     * @param max? 
     * @returns boolean
     */
    public numberValid(value: number, min?: number, max?: number): boolean {
        if (typeof value != "number") { return false }
        else if (typeof min == "number" && value < min) { return false }
        else if (typeof max == "number" && value > max) { return false }
        else { return true }
    }





    






}