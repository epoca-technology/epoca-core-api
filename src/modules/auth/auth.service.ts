import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { 
    IAuthService, 
    IAuthValidations,
    IUser, 
    IUserRecord, 
    IAuthModel, 
    IApiSecretService, 
    IAuthorities,
    IAuthority,
    ISignInToken
} from "./interfaces";




@injectable()
export class AuthService implements IAuthService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;
    @inject(SYMBOLS.AuthModel)                         private _model: IAuthModel;
    @inject(SYMBOLS.AuthValidations)                   private _validations: IAuthValidations;
    @inject(SYMBOLS.ApiSecretService)                  private _apiSecret: IApiSecretService;

    // Authorities Object
    public authorities: IAuthorities = {};


    constructor() {}





    /* Initialization */





    /**
     * Makes sure the god user is properly created as well as initializing the API secrets 
     * and the authorities.
     * @returns initialize(): Promise<void>
     */
    public async initialize(): Promise<void> {
        // Firstly, check the god account
        await this.checkGodAccount();

        // Retrieve all the users
        const users: IUser[] = await this._model.getAll();

        // Make sure there is at least 1 user registered
        if (!users.length) {
            throw new Error(this._utils.buildApiError(`Couldnt initialize the Auth Module because there are no users stored in the db.`, 8000));
        }

        // Initialize the authorities object
        users.forEach((u: IUser) => { this.authorities[u.uid] = u.authority });

        // Initialize the API Secrets
        await this._apiSecret.refreshSecrets(Object.keys(this.authorities));
    }






    /**
     * Checks if the god account has been created correctly, otherwise it 
     * handles whatever correction it may require.
     * @returns Promise<void>
     */
    private async checkGodAccount(): Promise<void> {
        // Retrieve the user & firebase user
        const values: [IUserRecord|undefined, IUser|undefined] = await Promise.all([
            this._model.getFirebaseUserRecord(this._model.god.uid),
            this._model.getUser(this._model.god.uid)
        ]);

        // If none are found, make use of the standard functionality
        if (values[0] === undefined && values[1] === undefined) {
            await this._model.createUser(5);
        }
        
        // If the firebase user exists, but not in the db, insert it
        else if (values[0] !== undefined && values[1] === undefined) {
            await this._model.insertUserIntoDatabase(this._model.god.uid, this._model.god.email, this._model.god.otpSecret, 5);
        }

        // If the user exists in the db but not in Firebase, create it
        else if (values[0] === undefined && values[1] !== undefined) {
            await this._model.createFirebaseUser(this._model.god.uid, this._model.god.email, this._model.god.password);
        }
    }














    /* Retrievers */



    

    /**
     * Retrieves a list with all the registered users.
     * @returns Promise<IUser[]>
     */
    public getAll(): Promise<IUser[]> { return this._model.getAll() }







    


    /**
     * Retrieves a list with all the registered FCM Tokens.
     * @returns Promise<string[]>
     */
     public getFCMTokens(): Promise<string[]> { return this._model.getFCMTokens() }
















    /* User Management */







    /**
     * Creates a new user and it also generates the API secret and returns the uid. 
     * If an error is thrown, it will attempt to rollback the creation.
     * @param email 
     * @param authority 
     * @returns Promise<string>
     */
    public async createUser(email: string, authority: IAuthority): Promise<string> {
        // Validate the request
        await this._validations.canUserBeCreated(email, authority);

        // Make sure the email is lowercased
        email = email.toLowerCase();

        // Create the user
        const uid: string = await this._model.createUser(authority, email);

        try {
            // Create he user's secret
            await this._apiSecret.refreshSecrets([uid]);

            // Add it to the authorities object
            this.authorities[uid] = authority;

            // Return the uid
            return uid;
        } catch (e) {
            // Delete the user safely
            try { await this._model.deleteUser(uid) } 
            catch (e) {
                // Log API Error
                console.error(`Error when deleting a user (${email}) on creation error: `, e);
                // @TODO
            }

            // Rethrow the original error
            throw e;
        }
    }









    /**
     * Updates a user's email on both, Firebase & DB.
     * @param uid 
     * @param newEmail 
     * @returns Promise<void>
     */
    public async updateEmail(uid: string, newEmail: string): Promise<void> {
        // Retrieve the user
        const user: IUser|undefined = await this._model.getUser(uid);

        // Validate the request
        await this._validations.canEmailBeUpdated(uid, user, newEmail);

        // Make sure the new email is lowercased
        newEmail = newEmail.toLowerCase();

        // Perform the action
        await this._model.updateEmail(uid, newEmail, user.email);
    }







    /**
     * Updates a user's password on Firebase.
     * @param email 
     * @param newPassword
     * @param otp
     * @param recaptcha
     * @returns Promise<void>
     */
     public async updatePassword(email: string, newPassword: string, otp: string, recaptcha: string): Promise<void> {
        // Retrieve the user by email
        const user: IUser|undefined = await this._model.getUserByEmail(email);

        // Validate the request
        await this._validations.canPasswordBeUpdated(user, newPassword, otp, recaptcha);

        // Perform the action
        await this._model.updatePassword(user.uid, newPassword);
    }










    /**
     * Updates a user's OTP Secret on the db.
     * @param uid 
     * @returns Promise<void>
     */
     public async updateOTPSecret(uid: string): Promise<void> {
        // Validate the request
        await this._validations.canOTPSecretBeUpdated(uid);

        // Perform the action
        await this._model.updateOTPSecret(uid);
    }











    /**
     * Updates a user's authority on the DB and on the local object.
     * @param uid 
     * @param newAuthority
     * @returns Promise<void>
     */
     public async updateAuthority(uid: string, newAuthority: IAuthority): Promise<void> {
        // Retrieve the user
        const user: IUser|undefined = await this._model.getUser(uid);

        // Validate the request
        this._validations.canAuthorityBeUpdated(uid, user, newAuthority);

        // Perform the action
        await this._model.updateAuthority(uid, newAuthority);

        // Update the local object
        this.authorities[uid] = newAuthority;
    }








    /**
     * Updates a user's FCM Token on the db.
     * @param uid 
     * @param newFCMToken 
     * @returns Promise<void>
     */
     public async updateFCMToken(uid: string, newFCMToken: string): Promise<void> {
        // Validate the request
        await this._validations.canFCMTokenBeUpdated(uid, newFCMToken);

        // Perform the action
        await this._model.updateFCMToken(uid, newFCMToken);
    }








    /**
     * Deletes a user from Firebase and the database.
     * @param uid 
     * @returns Promise<void>
     */
     public async deleteUser(uid: string): Promise<void> {
        // Validate the request
        await this._validations.canUserBeDeleted(uid);

        // Perform the action
        await this._model.deleteUser(uid);

        // Remove the user from the authorites object
        delete this.authorities[uid];

        // Delete the API Secret safely
        try { await this._apiSecret.removeSecret(uid) } 
        catch (e) {
            console.error(`Error when removing the API secret for ${uid}.`, e);
        }
    }










     /* Sign In */





     /**
      * After verifying the provided credentials are valid, it generates the sign in token.
      * @param email 
      * @param password 
      * @param otp 
      * @param recaptcha 
      * @returns Promise<ISignInToken>
      */
     public async getSignInToken(email: string, password: string, otp: string, recaptcha: string): Promise<ISignInToken> {
        // Make sure the email is lowercased if provided
        email = typeof email == "string" ? email.toLowerCase(): email;

        // Retrieve the user by email
        const user: IUser|undefined = await this._model.getUserByEmail(email);

        // Validate the request
        await this._validations.canGetSignInToken(user, email, password, otp, recaptcha);

        // Generate the token
        const token = await this._model.getSignInToken(user.uid, this.authorities[user.uid]);

        // Return the token object
        return {
            token: token,
            authority: this.authorities[user.uid]
        }
    }













     /* OTP Verification */




    /**
     * Checks if the OTP Token is valid. If not, throws an error.
     * @param uid 
     * @param otpToken 
     * @returns Promise<void>
     */
    public validateOTPToken(uid: string, otpToken: string): Promise<void> { return this._validations.validateOTPToken(uid, otpToken) }










    

    /* ID Token */





    /**
     * Validates an ID Token and attempts to decode it. If successful, it returns the uid.
     * @param token 
     * @returns Promise<string>
     */
    public verifyIDToken(token: string): Promise<string> {
        // Validate the token
        this._validations.canVerifyIDToken(token);

        // Decode it and return the uid
        return this._model.verifyIDToken(token);
    }
}
