import {UserRecord} from "firebase-admin/auth";


// General Types
export type IUserRecord = UserRecord;



// Service
export interface IAuthService {

}



// Model
export interface IAuthModel {


    // Retrievers

    getFirebaseUserRecord(uid: string): Promise<IUserRecord|undefined>,
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


// User Build
export interface IUserBuild {
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