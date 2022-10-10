import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IValidationsService, IUtilitiesService } from "./interfaces";
import { version as uuidVersion, validate as uuidValidate } from 'uuid';
import { IAuthority } from "../auth";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";


@injectable()
export class ValidationsService implements IValidationsService {
    // Inject Dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;

    // reCAPTCHA Secret
    private readonly recaptchaSecret = environment.recaptchaSecret;

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









    /* FCM */



    /**
     * Verifies if a FCM Token is valid.
     * @param token 
     * @returns boolean
     */
     public fcmTokenValid(token: string): boolean { return typeof token == "string" && token.length >= 50 && token.length <= 300 }












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









    /* ID Token */



    /**
     * Verifies if a ID Token is valid.
     * @param token 
     * @returns boolean
     */
     public idTokenValid(token: string): boolean { return typeof token == "string" && token.length >= 100 && token.length <= 3000 }











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





    







    /* reCAPTCHA */







    /**
     * Verifies that a provided reCAPTCHA challenge response is valid.
     * @param recaptcha 
     * @returns Promise<boolean>
     */
    public async recaptchaValid(recaptcha: string): Promise<boolean> {
        // Make sure the format has a valid format
        if (typeof recaptcha != "string" || recaptcha.length < 15 || recaptcha.length > 3000) {
            return false;
        }

        // Build options
        const options: IExternalRequestOptions = {
            host: 'google.com',
            path: `/recaptcha/api/siteverify?secret=${this.recaptchaSecret}&response=${recaptcha}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Send the HTTP Request
        const response: IExternalRequestResponse = await this._er.request(options);

        // Validate the data
        if (!response || typeof response.data != "object" || typeof response.data.success != "boolean") {
            console.log(response);
            throw new Error(this._utils.buildApiError(`The reCAPTCHA could not be validated because Googles API returned an invalid verification response.`, 10000));
        }

        // Return the result of the verification
        return response.data.success;
    }












    
    /* IP */



    /**
     * Verifies if a provided IP is valid.
     * @param ip 
     * @returns boolean
     */
    public ipValid(ip: string): boolean { return typeof ip == "string" && ip.length >= 5 && ip.length <= 300 }







    /**
     * Verifies if the provided IP Notes are valid.
     * @param notes 
     * @returns boolean
     */
    public ipNotesValid(notes: string): boolean { return typeof notes == "string" && notes.length >= 5 && notes.length <= 3000 }










    /* Epoch */



    /**
     * Verifies if a provided Epoch ID is valid.
     * @param id 
     * @returns boolean
     */
    public epochIDValid(id: string): boolean {
        return typeof id == "string" && id.length >= 4 && id.length <= 100 && id[0] == "_";
    }






    /**
     * Verifies if a provided Regression or Prediction Model ID is valid.
     * @param id 
     * @returns boolean
     */
     public modelIDValid(id: string): boolean {
        return typeof id == "string" && id.length >= 30 && id.length <= 200;
    }
}