import {BigNumber} from 'bignumber.js';
import { GenerateOptions } from 'generate-password';
import { IAuthority } from '../auth';


// Service
export interface IUtilitiesService {
    // Numbers
    calculateAverage(numberSeries: INumber[], config?: INumberConfig): INumber,
    alterNumberByPercentage(value: INumber, percent: INumber, config?: INumberConfig): INumber,
    calculatePercentageChange(oldNumber: INumber, newNumber: INumber, config?: INumberConfig): INumber,
    calculatePercentageOutOfTotal(value: INumber, total: INumber, config?: INumberConfig): INumber,
    calculateFee(value: INumber, feePercentage: INumber, config?: INumberConfig): INumber,
    closeEnough(val1: INumber, val2: INumber, maxDifference: number): boolean,
    outputNumber(value: INumber, config?: INumberConfig): INumber,
    getBigNumber(value: INumber): BigNumber,

    // UUID (Universally Unique IDentifier)
    generateID(): string,

    // API Response
    apiResponse(data?: any, error?: string): IAPIResponse,
    buildApiError(e: any, code?: number): string,
    getCodeFromApiError(apiError: any): number,

    // Error Message Extraction
    getErrorMessage(e: any): string,

    // Conversions
    fromBytesToGigabytes(bytes: number): number,
    fromSecondsToHours(seconds: number): number,

    // Dates
    getTimestamp(date: string): number,
    toDateString(timestamp: number): string,

    // Password
    generatePassword(options?: GenerateOptions): string,

    // Async Delay
    asyncDelay(seconds: number): Promise<void>,
}





// Validations Service
export interface IValidationsService {
    // UUID
    uuidValid(uuid: string): boolean,

    // Auth
    emailValid(email: string): boolean,
    passwordValid(password: string): boolean,
    authorityValid(authority: IAuthority, maxAuthority?: IAuthority): boolean,

    // FCM
    fcmTokenValid(token: string): boolean,

    // API Secret
    apiSecretValid(secret: string): boolean,

    // OTP Token
    otpTokenValid(token: string): boolean,

    // ID Token
    idTokenValid(token: string): boolean,

    // Numbers
    numberValid(value: number, min?: number, max?: number): boolean,

    // reCAPTCHA
    recaptchaValid(recaptcha: string): Promise<boolean>,

    // IP
    ipValid(ip: string): boolean,
    ipNotesValid(notes: string): boolean,
}







/* Numbers */

// Number Format
export type INumber = number|string|BigNumber;



// Number Config
export interface INumberConfig {
    of?: INumberOutputFormat,    // Output Format: Defaults to 'n'
    dp?: number,                 // Decimal Places: Defaults to 2
    ru?: boolean,                // Round Up: Defaults to false
    rm?: BigNumber.RoundingMode  // Rounding Mode: It's inserted in the service
}
export type INumberOutputFormat = 'n'|'s'|'bn';






/* API Response */
export interface IAPIResponse {
    success: boolean,
    data?: any,
    error?: string 
}







/* reCATPCHA */
export interface IRecaptchaVerificationResponse {
    "success": boolean,
    "challenge_ts": string,     // timestamp of the challenge load (ISO format yyyy-MM-dd'T'HH:mm:ssZZ)
    "hostname": string,         // the hostname of the site where the reCAPTCHA was solved
    "error-codes": any[]        // optional
}