import {injectable, inject} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { IAuthValidations, IAuthModel, IAuthority, IUser } from "./interfaces";




@injectable()
export class AuthValidations implements IAuthValidations {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                 private _validations: IValidationsService;
    @inject(SYMBOLS.AuthModel)                          private _model: IAuthModel;
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;

    // Test Mode
    private readonly testMode: boolean = environment.testMode;

    // Firebase API Key
    private readonly firebaseApiKey: string = environment.firebase.apiKey;


    constructor() {}










    /* User Management */




    /**
     * Checks if an user can be created. Otherwise it throws an error.
     * @param email 
     * @param authority 
     * @returns Promise<void>
     */
    public async canUserBeCreated(email: string, authority: IAuthority): Promise<void> {
        // Make sure the email has a valid format
        if (!this._validations.emailValid(email)) {
            throw new Error(this._utils.buildApiError(`The provided email (${email}) has an invalid format.`, 8500));
        }

        // Make sure the authority is valid
        if (!this._validations.authorityValid(authority, 4)) {
            throw new Error(this._utils.buildApiError(`The provided authority (${authority}) is invalid.`, 8501));
        }

        // Make sure the email is not currently in use
        const user: IUser|undefined = await this._model.getUserByEmail(email);
        if (user !== undefined) {
            throw new Error(this._utils.buildApiError(`The provided email (${email}) is already being used by another user.`, 8502));
        }
    }








    /**
     * Checks if a user email can be updated. Otherwise it throws an error.
     * @param uid 
     * @param user 
     * @param newEmail 
     * @returns Promise<void>
     */
    public async canEmailBeUpdated(uid: string, user: IUser|undefined, newEmail: string): Promise<void> {
        // Firstly, make sure the user was actually found
        if (!user) {
            throw new Error(this._utils.buildApiError(`The email cannot be updated because the user (${uid}) couldnt be found.`, 8503));
        }

        // Make sure the new email has a valid format
        if (!this._validations.emailValid(newEmail)) {
            throw new Error(this._utils.buildApiError(`The provided email (${newEmail}) has an invalid format.`, 8500));
        }

        // Make sure the user is not god
        if (uid == this._model.god.uid) {
            throw new Error(this._utils.buildApiError(`The god user is inmutable, the email (${newEmail}) cannot be set.`, 8509));
        }

        // Make sure the new email is not in use
        const newEmailUser: IUser|undefined = await this._model.getUserByEmail(newEmail);
        if (newEmailUser !== undefined) {
            throw new Error(this._utils.buildApiError(`The provided email (${newEmail}) is already being used by another user.`, 8502));
        }
    }






    

    /**
     * Checks if a password can be updated. Otherwise it throws an error.
     * @param user 
     * @param newPassword 
     * @param otp 
     * @param recaptcha 
     * @returns Promise<void>
     */
    public async canPasswordBeUpdated(user: IUser|undefined, newPassword: string, otp: string, recaptcha: string): Promise<void> {
        // Firstly, make sure the user was actually found
        if (!user) {
            throw new Error(this._utils.buildApiError(`The password cannot be updated because the user couldnt be found.`, 8503));
        }

        // Validate the password
        if (!this._validations.passwordValid(newPassword)) {
            throw new Error(this._utils.buildApiError(`The provided password is invalid.`, 8505));
        }

        // Make sure the user is not god
        if (user.uid == this._model.god.uid) {
            throw new Error(this._utils.buildApiError(`The god user is inmutable, the password cannot be updated.`, 8509));
        }

        // Validate the OTP Token
        await this.validateOTPToken(user.uid, otp);

        // Validate the reCAPTCHA unless test mode is active
        if (!this.testMode) {
            const reCATPCHAValid: boolean = await this._validations.recaptchaValid(recaptcha);
            if (!reCATPCHAValid) {
                throw new Error(this._utils.buildApiError(`The provided reCAPTCHA is invalid.`, 8511));
            }
        }
    }









    

    /**
     * Checks if a OTP secret can be updated. Otherwise it throws an error.
     * @param uid 
     * @returns Promise<void>
     */
     public async canOTPSecretBeUpdated(uid: string): Promise<void> {
        // Firstly, make sure the uid is valid
        if (!this._validations.uuidValid(uid)) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) is invalid.`, 8504));
        }

        // Make sure the user is not god
        if (uid == this._model.god.uid) {
            throw new Error(this._utils.buildApiError(`The god user is inmutable, the OTP Secret cannot be updated.`, 8509));
        }

        // Make sure the user actually exists
        const user: IUser|undefined = await this._model.getUser(uid);
        if (!user) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) didnt match any users in the database.`, 8506));
        }
    }










    /**
     * Checks if the user's authority can be updated.
     * @param uid 
     * @param newAuthority 
     * @returns void
     */
     public canAuthorityBeUpdated(uid: string, user: IUser|undefined, newAuthority: IAuthority): void {
        // Firstly, make sure the user was actually found
        if (!user) {
            throw new Error(this._utils.buildApiError(`The authority cannot be updated because the user (${uid}) couldnt be found.`, 8503));
        }

        // Make sure the authority is different from the existing one
        if (user.authority == newAuthority) {
            throw new Error(this._utils.buildApiError(`The new authority cannot be the same as the on in the DB for user (${uid}).`, 8507));
        }

        // Make sure the user is not god
        if (uid == this._model.god.uid) {
            throw new Error(this._utils.buildApiError(`The god user is inmutable, the authority (${newAuthority}) cannot be set.`, 8509));
        }

        // Make sure the authority is valid
        if (!this._validations.authorityValid(newAuthority, 4)) {
            throw new Error(this._utils.buildApiError(`The provided authority (${newAuthority}) is invalid.`, 8501));
        }
    }






    

    /**
     * Checks if a FCM Token can be updated. Otherwise it throws an error.
     * @param uid 
     * @param newFCMToken 
     * @returns Promise<void>
     */
     public async canFCMTokenBeUpdated(uid: string, newFCMToken: string): Promise<void> {
        // Firstly, make sure the uid is valid
        if (!this._validations.uuidValid(uid)) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) is invalid.`, 8504));
        }

        // Make sure the token is valid
        if (!this._validations.fcmTokenValid(newFCMToken)) {
            throw new Error(this._utils.buildApiError(`The provided FCM Token (${newFCMToken}) is invalid.`, 8508));
        }

        // Make sure the user actually exists
        const user: IUser|undefined = await this._model.getUser(uid);
        if (!user) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) didnt match any users in the database.`, 8506));
        }
    }








    /**
     * Checks if a user can be deleted.
     * @param uid 
     * @returns Promise<void>
     */
    public async canUserBeDeleted(uid: string): Promise<void> {
        // Firstly, make sure the uid is valid
        if (!this._validations.uuidValid(uid)) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) is invalid.`, 8504));
        }

        // Make sure the user is not god
        if (uid == this._model.god.uid) {
            throw new Error(this._utils.buildApiError(`The god user is inmutable and therefore, cannot be deleted.`, 8509));
        }

        // Make sure the user actually exists
        const user: IUser|undefined = await this._model.getUser(uid);
        if (!user) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) didnt match any users in the database.`, 8506));
        }
    }










    
    /* Sign In */







    /**
     * Verifies if a sign in token can be generated for a user.
     * @param user 
     * @param email 
     * @param password 
     * @param otp 
     * @param recaptcha 
     * @returns Promise<void>
     */
    public async canGetSignInToken(
        user: IUser|undefined, 
        email: string, 
        password: string, 
        otp: string,
        recaptcha: string,
    ): Promise<void> {
        // Firstly, make sure the user was actually found
        if (!user) {
            throw new Error(this._utils.buildApiError(`Cannot generate a sign in token because the user (${email}) couldnt be found.`, 8503));
        }

        // Make sure the email has a valid format
        if (!this._validations.emailValid(email)) {
            throw new Error(this._utils.buildApiError(`The provided email (${email}) has an invalid format.`, 8500));
        }

        // Validate the password
        if (!this._validations.passwordValid(password)) {
            throw new Error(this._utils.buildApiError(`The provided password is invalid.`, 8505));
        }

        // Validate the OTP Token
        await this.validateOTPToken(user.uid, otp);

        // Validate the reCAPTCHA unless test mode is active
        if (!this.testMode) {
            const reCATPCHAValid: boolean = await this._validations.recaptchaValid(recaptcha);
            if (!reCATPCHAValid) {
                throw new Error(this._utils.buildApiError(`The provided reCAPTCHA is invalid.`, 8511));
            }
        }

        // Finally, make sure the credentials are valid
        await this.verifyCredentials(email, password);
    }







    /**
     * Verifies with Google's Identity Toolkit API if the provided email and password
     * are correct. Throws an error otherwise.
     * @param email 
     * @param password 
     * @returns Promise<void>
     */
    private async verifyCredentials(email: string, password: string): Promise<void> {
        // Build options
        const options: IExternalRequestOptions = {
            host: 'identitytoolkit.googleapis.com',
            path: `/v1/accounts:signInWithPassword?key=${this.firebaseApiKey}`,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        };

        // Send the HTTP Request
        const response: IExternalRequestResponse = await this._er.request(options, {
            email: email,
            password: password,
            returnSecureToken: true
        });

        // If the status code is different to 200, the credentials are invalid
        if (response.statusCode != 200) {
            throw new Error(this._utils.buildApiError(`The provided credentials are invalid.`, 8512));
        }
    }













    /* OTP Verification */





    /**
     * Verifies if an OTP Token has a valid format and can be checked. If invalid
     * or expired, it throws an error.
     * @param uid 
     * @param otp 
     * @returns Promise<void>
     */
    public async validateOTPToken(uid: string, otp: string): Promise<void> {
        // Firstly, make sure the uid is valid
        if (!this._validations.uuidValid(uid)) {
            throw new Error(this._utils.buildApiError(`The provided uid (${uid}) is invalid.`, 8504));
        }

        // Validate the OTP Token's Format
        if (!this._validations.otpTokenValid(otp)) {
            throw new Error(this._utils.buildApiError(`The provided OTP Token (${otp}) has an invalid format.`, 8510));
        }

        // Make sure the token is still valid
        await this._model.checkOTPToken(uid, otp);
    }








    /* ID Token */




    /**
     * Verifies that an ID token has a valid format.
     * @param token 
     * @returns void
     */
    public canVerifyIDToken(token: string): void {
        if (!this._validations.idTokenValid(token)) {
            throw new Error(this._utils.buildApiError(`The provided ID Token has an invalid format.`, 8513));
        }
    }
}
