import {injectable, inject} from "inversify";
import { environment, IGod, SYMBOLS } from "../../ioc";
import {getAuth, Auth, } from "firebase-admin/auth";
import { IAuthModel, IUserRecord, IAuthority, IUser, IUserBuild } from "./interfaces";
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
    private readonly god: IGod = environment.god;


    constructor() {
        // Authenticator options
        authenticator.options = { window: 2, step: 30 };
    }






    /* Users Management */








    /**
     * Creates a Firebase User and then inserts the user record in the DB.
     * @param authority 
     * @param email? 
     * @returns Promise<string>
     */
    public async createUser(authority: IAuthority, email?: string): Promise<string> {
        // Build the user data
        const build: IUserBuild = this.getUserBuild(authority, email);

        // Create the firebase user
        const fbUser: IUserRecord = await this.auth.createUser({
            uid: build.user.uid,
            email: build.user.email,
            password: build.password
        });

        // Add the user to the database
        try {
            // Insert the record
            // @TODO

            // Return the generated uid
            return build.user.uid;
        } catch (e) {
            // Delete the Firebase User
            await this.deleteFirebaseUserPersistently(build.user.uid);

            // Rethrow the error
            throw e;
        }
    }









    /**
     * Builds the user data in order for a normal or a god user to be created.
     * @param authority 
     * @param email?
     * @returns IUserBuild
     */
    private getUserBuild(authority: IAuthority, email?: string): IUserBuild {
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
     * Deletes a user on Firebase and on the DB.
     * @param uid 
     * @returns Promise<void>
     */
    public async deleteUser(uid: string): Promise<void> {

    }







    /**
     * Attempts to delete a firebase user in a persistent way as long as
     * the user exists, otherwise, just throws an error.
     * @param uid 
     * @returns Promise<void>
     */
    private async deleteFirebaseUserPersistently(uid: string): Promise<void> {

    }






    










    /* Retrievers */








   

    



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











}