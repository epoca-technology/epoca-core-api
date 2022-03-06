import {injectable, inject} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
import { IAuthService, IApiSecretService, IAuthority } from "../auth";
import { IIPBlacklistService } from "../ip-blacklist";
import { IUtilitiesService } from "../utilities";
import { IRequestGuardService } from "./interfaces";




@injectable()
export class RequestGuardService implements IRequestGuardService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.AuthService)                        private _auth: IAuthService;
    @inject(SYMBOLS.ApiSecretService)                   private _apiSecret: IApiSecretService;
    @inject(SYMBOLS.IPBlacklistService)                 private _ipBlacklist: IIPBlacklistService;

    // App Initialization - API can only accept requests when init is complete
    public apiInitialized: boolean = false;

    // Test Mode
    private readonly testMode: boolean = environment.testMode;


    constructor() {}









    /**
     * Checks if an authenticated request meets all the requirements in order to interact with the API.
     * If not, it will throw an error. If successful, it returns the uid of the client.
     * @param idToken 
     * @param apiSecret 
     * @param clientIP 
     * @param requiredAuthority 
     * @param requiredParams 
     * @param params 
     * @param otp? 
     * @returns Promise<string>
     */
    public async validateRequest(
        idToken: string,
        apiSecret: string,
        clientIP: string,
        requiredAuthority: IAuthority,
        requiredParams?: string[],
        params?: object,
        otp?: string
    ): Promise<string> {
        // Perform a public request validation
        this.validatePublicRequest(clientIP, requiredParams, params);

        // Decode the ID Token
        const uid: string = await this._auth.verifyIDToken(idToken);

        // Verify the API Secret
        await this._apiSecret.verifySecret(uid, apiSecret);

        // Make sure the user is authorized
        this._auth.isUserAuthorized(uid, requiredAuthority);

        // Validate the OTP if required
        if (typeof otp == "string") await this._auth.validateOTPToken(uid, otp);

        // Return the decoded uid
        return uid;
    }






    /**
     * Checks if a public request meets all the requirements in order to interact with the API.
     * @param clientIP 
     * @param requiredParams 
     * @param params 
     * @returns Promise<void>
     */
    public validatePublicRequest(
        clientIP: string,
        requiredParams?: string[],
        params?: object,
    ): void {
        // Make sure the API is not running on test mode
        if (this.testMode) {
            throw new Error(this._utils.buildApiError('The API cannot accept requests because it is running on test mode.', 12000));
        }

        // Make sure the API has been initialized
        if (!this.apiInitialized) {
            throw new Error(this._utils.buildApiError('The API cannot accept requests because it has not yet been initialized.', 12001));
        }

        // Make sure the IP is not in the blacklist
        this._ipBlacklist.isIPBlacklisted(clientIP);

        // Make sure all required params have been provided
        requiredParams = requiredParams || [];
        params = params || {};
        for (let paramKey of requiredParams) {
            if (params[paramKey] === undefined || params[paramKey] === null || params[paramKey] === '' || params[paramKey] === NaN) {
                throw new Error(this._utils.buildApiError(`The param (${paramKey}) is required but was not provided.`, 12002));
            }
        }
    }
}