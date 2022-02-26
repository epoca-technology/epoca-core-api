import {UserRecord} from "firebase-admin/auth";
import { IQueryResult } from "../database";


// General Types
export type IUserRecord = UserRecord;



// Service
export interface IAuthService {

}



// Model
export interface IAuthModel {
    // Retrievers
    getAll(): Promise<IUser[]>,
    getUser(uid: string): Promise<IUser|undefined>,
    getUserByEmail(email: string): Promise<IUser|undefined>,
    getFirebaseUserRecord(uid: string): Promise<IUserRecord|undefined>,

    // Users Management
    createUser(authority: IAuthority, email?: string): Promise<string>,
    createFirebaseUser(uid: string, email: string, password: string): Promise<IUserRecord>,
    insertUserIntoDatabase(uid: string, email: string, otp_secret: string, authority: IAuthority): Promise<IQueryResult>,
    deleteUser(uid: string): Promise<void>,

    // OTP Verification
    checkOTPToken(uid: string, otpToken: string): Promise<boolean>
}



// Validations
export interface IAuthValidations {

}





// Authority
export type IAuthority = 1|2|3|4|5;




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