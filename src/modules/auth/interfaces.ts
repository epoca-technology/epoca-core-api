import {UserRecord} from "firebase-admin/auth";
import { IGod } from "../../ioc";


// General Types
export type IUserRecord = UserRecord;



// Service
export interface IAuthService {
    // Properties
    authorities: IAuthorities,

    // Initialization
    initialize(): Promise<void>,

    // Retrievers
    getAll(): Promise<IUser[]>,
    getFCMTokens(): Promise<string[]>,

    // User Management
    createUser(email: string, authority: IAuthority): Promise<string>,
    updateEmail(uid: string, newEmail: string): Promise<void>,
    updatePassword(email: string, newPassword: string, otp: string, recaptcha: string): Promise<void>,
    updateOTPSecret(uid: string): Promise<void>,
    updateAuthority(uid: string, newAuthority: IAuthority): Promise<void>,
    updateFCMToken(uid: string, newFCMToken: string): Promise<void>,
    deleteUser(uid: string): Promise<void>,

    // Sign In
    getSignInToken(email: string, password: string, otp: string, recaptcha: string,): Promise<string>,

    // OTP Verification
    validateOTPToken(uid: string, otpToken: string): Promise<void>,

    // ID Token
    verifyIDToken(token: string): Promise<string>,
}



// Model
export interface IAuthModel {
    // Properties
    god: IGod,

    // Retrievers
    getAll(): Promise<IUser[]>,
    getUser(uid: string): Promise<IUser|undefined>,
    getUserByEmail(email: string): Promise<IUser|undefined>,
    getFirebaseUserRecord(uid: string): Promise<IUserRecord|undefined>,
    getFCMTokens(): Promise<string[]>,

    // User Management
    createUser(authority: IAuthority, email?: string): Promise<string>,
    createFirebaseUser(uid: string, email: string, password: string): Promise<IUserRecord>,
    insertUserIntoDatabase(uid: string, email: string, otp_secret: string, authority: IAuthority): Promise<void>,
    updateEmail(uid: string, newEmail: string, oldEmail: string): Promise<void>,
    updatePassword(uid: string, newPassword: string): Promise<void>,
    updateOTPSecret(uid: string): Promise<void>,
    updateAuthority(uid: string, newAuthority: IAuthority): Promise<void>,
    updateFCMToken(uid: string, newFCMToken: string): Promise<void>,
    deleteUser(uid: string): Promise<void>,

    // Sign In
    getSignInToken(uid: string, authority: IAuthority): Promise<string>,

    // OTP Verification
    checkOTPToken(uid: string, otpToken: string): Promise<void>,

    // ID Token
    verifyIDToken(token: string): Promise<string>,
}



// Validations
export interface IAuthValidations {
    // User Management
    canUserBeCreated(email: string, authority: IAuthority): Promise<void>,
    canEmailBeUpdated(uid: string, user: IUser|undefined, newEmail: string): Promise<void>,
    canPasswordBeUpdated(user: IUser|undefined, newPassword: string, otp: string, recaptcha: string): Promise<void>,
    canOTPSecretBeUpdated(uid: string): Promise<void>,
    canAuthorityBeUpdated(uid: string, user: IUser|undefined, newAuthority: IAuthority): void,
    canFCMTokenBeUpdated(uid: string, newFCMToken: string): Promise<void>,
    canUserBeDeleted(uid: string): Promise<void>,

    // Sign In
    canGetSignInToken(
        user: IUser|undefined, 
        email: string, 
        password: string, 
        otp: string,
        recaptcha: string,
    ): Promise<void>,

    // OTP Token
    validateOTPToken(uid: string, otp: string): Promise<void>,

    // ID Token
    canVerifyIDToken(token: string): void,
}





// Authority
export type IAuthority = 1|2|3|4|5;
export interface IAuthorities { [uid: string]: IAuthority }



// User
export interface IUser {
    uid: string,
    email: string,
    otp_secret: string,
    authority: IAuthority,
    fcm_token?: string,
    creation: number
}


// User Creation Build
export interface IUserCreationBuild {
    user: IUser,
    password: string
}














/* API Secret  */


// API Secret Service
export interface IApiSecretService {
    // Secrets Management
    refreshSecrets(uids: string[]): Promise<void>,
    removeSecret(uid: string): Promise<void>,

    // Secret Verification
    verifySecret(uid: string, secret: string): Promise<void>,
}

// Secrets Object
export interface IApiSecrets {
    [uid: string]: IApiSecretRecord
}

// Record
export interface IApiSecretRecord {
    s: string,  // Secret
    t: number   // Creation Timestamp
}