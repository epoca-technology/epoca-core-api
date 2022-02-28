import {injectable, inject} from "inversify";
import { environment, IGod, SYMBOLS } from "../../ioc";
import {getAuth, Auth, } from "firebase-admin/auth";
import { IAuthModel, IUserRecord, IAuthority, IUser, IUserCreationBuild } from "./interfaces";
import { IDatabaseService } from "../database";
import { IUtilitiesService } from "../utilities";
import { authenticator } from 'otplib';



@injectable()
export class AuthModel implements IAuthModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                   private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                  private _utils: IUtilitiesService;

    // Auth Instance
    private readonly auth: Auth = getAuth();

    // God Account
    public readonly god: IGod = environment.god;


    constructor() {
        // Authenticator options
        authenticator.options = { window: 2, step: 30 };
    }










    /* Retrievers */





    /**
     * Retrieves all the users ordered by authority ascending.
     * @returns Promise<IUser[]>
     */
     public async getAll(): Promise<IUser[]> {
        // Retrieve all the users
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.users} ORDER BY authority ASC`,
            values: []
        });

        // Make sure that there is at least 1 user
        if (rows.length) {
            return rows;
        } 
        
        // Otherwise, throw an error
        else {
            throw new Error(this._utils.buildApiError(`Couldnt retrieve the users as the table is currently empty.`, 8300));
        }
    }







    /**
     * Retrieves a user by uid. If the user does not exist it returns undefined.
     * @param uid 
     * @returns Promise<IUser|undefined>
     */
    public async getUser(uid: string): Promise<IUser|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.users} WHERE uid = $1`,
            values: [uid]
        });

        // Return the result
        return rows[0];
    }






    
    /**
     * Retrieves a user by email. If the user does not exist it returns undefined.
     * @param email 
     * @returns Promise<IUser|undefined>
     */
     public async getUserByEmail(email: string): Promise<IUser|undefined> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.users} WHERE email = $1`,
            values: [email]
        });

        // Return the result
        return rows[0];
    }






   

    



    /**
     * Retrieves a Firebase User Record by uid. If the user is not found it will
     * return undefined.
     * @param uid 
     * @returns Promise<IUserRecord|undefined>
     */
    public async getFirebaseUserRecord(uid: string): Promise<IUserRecord|undefined> {
        // Retrieve the user
        try { return await this.auth.getUser(uid) }
        catch (e) {
            // If the user does not exist, return undefined
            if (e.code == "auth/user-not-found") return undefined;

            // Otherwise, rethrow the error
            throw e;
        }
    }









    /**
     * Retrieves a list of all the registered FCM Tokens. Beware the list may be empty.
     * @returns Promise<string[]>
     */
     public async getFCMTokens(): Promise<string[]> {
        // Retrieve all the users
        const { rows } = await this._db.query({
            text: `SELECT fcm_token FROM ${this._db.tn.users} WHERE fcm_token IS NOT NULL`,
            values: []
        });

        // Make sure that there is at least 1 token
        if (rows.length) {
            let tokens: string[] = [];
            rows.forEach((d) => { tokens.push(d.fcm_token) });
            return tokens;
        } 
        
        // Otherwise, return an empty list
        else { return [] }
    }












    /* User Management */






    // User Creation


    /**
     * Creates a Firebase User and then inserts the user record in the DB.
     * @param authority 
     * @param email? 
     * @returns Promise<string>
     */
    public async createUser(authority: IAuthority, email?: string): Promise<string> {
        // Build the user data
        const build: IUserCreationBuild = this.getUserBuild(authority, email);

        // Create the firebase user
        await this.createFirebaseUser(build.user.uid, build.user.email, build.password);

        // Add the user to the database
        try {
            // Insert the record
            await this.insertUserIntoDatabase(
                build.user.uid,
                build.user.email,
                build.user.otp_secret,
                build.user.authority,
            );

            // Return the generated uid
            return build.user.uid;
        } catch (e) {
            // Delete the Firebase User safely
            try { await this.deleteFirebaseUserPersistently(build.user.uid) } 
            catch (e) { 
                // Log the API Error
                console.error(`The user ${build.user.email} (${build.user.uid}) couldnt be deleted from Firebase: `, e);
                // @TODO
            }
            
            // Rethrow the original error
            throw e;
        }
    }









    /**
     * Builds the user data in order for a normal or a god user to be created.
     * @param authority 
     * @param email?
     * @returns IUserBuild
     */
    private getUserBuild(authority: IAuthority, email?: string): IUserCreationBuild {
        // Init values
        let fUid: string;
        let fEmail: string;
        let fOTPSecret: string;
        let fPassword: string;

        // Build the god user
        if (authority == 5) {
            fUid = this.god.uid;
            fEmail = this.god.email;
            fOTPSecret = this.god.otpSecret;
            fPassword = this.god.password;
        }

        // Build a standard user
        else {
            fUid = this._utils.generateID();
            fEmail = email;
            fOTPSecret = authenticator.generateSecret();
            fPassword = this._utils.generatePassword({ length: 20 });
        }

        // Return the build
        return {
            user: {
                uid: fUid,
                email: fEmail,
                otp_secret: fOTPSecret,
                authority: authority,
                creation: Date.now()
            },
            password: fPassword
        }
    }








    /**
     * Creates a Firebase User Record.
     * @param uid 
     * @param email 
     * @param password 
     * @returns Promise<IUserRecord>
     */
    public createFirebaseUser(uid: string, email: string, password: string): Promise<IUserRecord> {
        return this.auth.createUser({
            uid: uid,
            email: email,
            password: password
        });
    }







    /**
     * Inserts a user into the database.
     * @param uid 
     * @param email 
     * @param otp_secret 
     * @param authority 
     * @returns Promise<void>
     */
    public async insertUserIntoDatabase(uid: string, email: string, otp_secret: string, authority: IAuthority): Promise<void> {
        await this._db.query({
            text: `
                INSERT INTO ${this._db.tn.users}(uid, email, otp_secret, authority, creation) 
                VALUES ($1, $2, $3, $4, $5)
            `,
            values: [uid, email, otp_secret, authority, Date.now()]
        });
    }









    // User Email Update





    /**
     * Updates the user's email. In case there is an issue, it will rollback the changes.
     * @param uid 
     * @param newEmail 
     * @param oldEmail 
     * @returns Promise<void>
     */
    public async updateEmail(uid: string, newEmail: string, oldEmail: string): Promise<void> {
        // Firstly, update the email on Firebase
        await this.updateFirebaseEmailPersistently(uid, newEmail);

        // Update the email on the db, in case of failure, rollback the email change on Firebase
        try {
            await this._db.query({
                text: `UPDATE ${this._db.tn.users} SET email = $1 WHERE uid = $2`,
                values: [newEmail, uid]
            });
        } catch (e) {
            // Rollback email changes on firebase safely
            try { await this.updateFirebaseEmailPersistently(uid, oldEmail) }
            catch (e) {
                // Log API Error
                console.error('There was an error when rolling back the Firebase Email Update.', e);
                // @TODO
            }

            // Rethrow the original error
            throw e;
        }
    }





    /**
     * Attempts to update a firebase user email in a persistent way.
     * @param uid 
     * @param email 
     * @returns Promise<void>
     */
     private async updateFirebaseEmailPersistently(uid: string, email: string): Promise<void> {
        try { await this.auth.updateUser(uid, {email: email}) }
        catch (e) {
            // Log the error and try again in a few seconds
            console.error(`Error when trying to update a Firebase User Email (1), attempting again in a few seconds. `, e);
            await this._utils.asyncDelay(5);

            try { await this.auth.updateUser(uid, {email: email}) }
            catch (e) {
                // Log the error and try again in a few seconds
                console.error(`Error when trying to update a Firebase User Email (2), attempting again in a few seconds. `, e);
                await this._utils.asyncDelay(5);
                await this.auth.updateUser(uid, {email: email});
            }
        }
    }









    // User Password Update





    /**
     * Updates the user's password.
     * @param uid 
     * @param newPassword 
     * @returns Promise<void>
     */
    public async updatePassword(uid: string, newPassword: string): Promise<void> {
        await this.auth.updateUser(uid, {password: newPassword});
    }






    // User OTP Secret





    /**
     * Updates the user's OTP Secret.
     * @param uid 
     * @returns Promise<void>
     */
    public async updateOTPSecret(uid: string): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.users} SET otp_secret = $1 WHERE uid = $2`,
            values: [authenticator.generateSecret(), uid]
        });
    }







    // User Authority




    /**
     * Updates the user's Authority.
     * @param uid 
     * @param newAuthority 
     * @returns Promise<void>
     */
    public async updateAuthority(uid: string, newAuthority: IAuthority): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.users} SET authority = $1 WHERE uid = $2`,
            values: [newAuthority, uid]
        });
    }






    
    // User FCM Token




    /**
     * Updates the user's FCM Token.
     * @param uid 
     * @param newFCMToken 
     * @returns Promise<void>
     */
     public async updateFCMToken(uid: string, newFCMToken: string): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.users} SET fcm_token = $1 WHERE uid = $2`,
            values: [newFCMToken, uid]
        });
    }









    // User Deletion





    /**
     * Deletes a user on Firebase and on the DB.
     * @param uid 
     * @returns Promise<void>
     */
    public async deleteUser(uid: string): Promise<void> {
        // Delete the Firebase User
        await this.deleteFirebaseUserPersistently(uid);

        // Delete the user from the DB
        await this.deleteUserFromDatabase(uid);
    }









    /**
     * Attempts to delete a firebase user in a persistent way as long as
     * the user exists, otherwise, just throws an error.
     * @param uid 
     * @returns Promise<void>
     */
    private async deleteFirebaseUserPersistently(uid: string): Promise<void> {
        try { await this.auth.deleteUser(uid) }
        catch (e) {
            // If the user does not exist, end the execution
            if (e.code == "auth/user-not-found") return;

            // Log the error and try again in a few seconds
            console.error(`Error when trying to delete a Firebase User (1), attempting again in a few seconds. `, e);
            await this._utils.asyncDelay(5);

            try { await this.auth.deleteUser(uid) }
            catch (e) {
                // If the user does not exist, end the execution
                if (e.code == "auth/user-not-found") return;
    
                // Log the error and try again in a few seconds
                console.error(`Error when trying to delete a Firebase User (2), attempting again in a few seconds. `, e);
                await this._utils.asyncDelay(5);
                await this.auth.deleteUser(uid)
            }
        }
    }









    /**
     * Deletes a user record from the DB.
     * @param uid 
     * @returns Promise<void>
     */
    private async deleteUserFromDatabase(uid: string): Promise<void> {
        await this._db.query({
            text: `DELETE FROM ${this._db.tn.users} WHERE uid = $1`,
            values: [uid]
        });
    }


    













    /* Sign In */





    /**
     * Given a uid and an authority, it will generate a sign in token.
     * @param uid 
     * @param authority 
     * @returns Promise<string>
     */
    public getSignInToken(uid: string, authority: IAuthority): Promise<string> {
        return this.auth.createCustomToken(uid, {authority: authority});
    }





    




    






    /* OTP Verification */






    /**
     * Retrieves the OTP Secret and checks if the provided otp token is valid and
     * active. Otherwise, it throws an error.
     * @param uid 
     * @param otpToken 
     * @returns Promise<void>
     */
    public async checkOTPToken(uid: string, otpToken: string): Promise<void> {
        // Retrieve the secret
        const secret: string = await this.getOTPSecret(uid);

        // Perform the check, if it is invalid, throw an error
        if (!authenticator.check(otpToken, secret)) {
            throw new Error(this._utils.buildApiError(`The provided OTP token (${otpToken}) is invalid or no longer active for uid: ${uid}.`, 8302));
        }
    }









    /**
     * Retrieves the otp secret for a user. If the uid is not found it throws an error.
     * @param uid 
     * @returns Promise<string>
     */
    private async getOTPSecret(uid: string): Promise<string> {
        // Retrieve the user
        const { rows } = await this._db.query({
            text: `SELECT otp_secret FROM  ${this._db.tn.users} WHERE uid = $1`,
            values: [uid]
        });

        // Make sure the response is valid
        if (!rows.length || typeof rows[0].otp_secret != "string") {
            throw new Error(this._utils.buildApiError(`Could not retrieve the otp secret because the uid (${uid}) was not found.`, 8301));
        }

        // Return the result
        return rows[0].otp_secret;
    }
}