/* Interfaces */
export interface IEnvironment {
    production: boolean,
    testMode: boolean,
    debugMode: boolean,
    restoreMode: boolean,
    POSTGRES_HOST: string,
    POSTGRES_USER: string,
    POSTGRES_PASSWORD: string,
    POSTGRES_DB: string,
    FLASK_SECRET_KEY: string,
    telegraf: ITelegrafConfig,
    recaptchaSecret: string,
    god: IGod,
    firebase: IFirebaseConfig,
}


// Telegraph
export interface ITelegrafConfig {
    token: string,
    chatID: number
}


// God User
export interface IGod {
    uid: string,
    email: string,
    password: string,
    otpSecret: string
}


// Firebase
export interface IFirebaseConfig {
    serviceAccount: { 
        type: string,
        project_id: string,
        private_key_id: string,
        private_key: string,
        client_email: string,
        client_id: string,
        auth_uri: string,
        token_uri: string,
        auth_provider_x509_cert_url: string,
        client_x509_cert_url: string
    },
    databaseURL: string,
    storageBucket: string,
    apiKey: string
}










/**
 * Initializer
 * Attempts to populate each environment variable. If there is any
 * kind of issue it will crash the server startup.
 */
const environment: IEnvironment = {
    production: getString('NODE_ENV', process.env.NODE_ENV) == 'production',
    testMode: process.env.testMode == 'true',
    debugMode: process.env.debugMode == 'true',
    restoreMode: process.env.restoreMode == 'true',
    POSTGRES_HOST: getString('POSTGRES_HOST', process.env.POSTGRES_HOST),
    POSTGRES_USER: getString('POSTGRES_USER', process.env.POSTGRES_USER),
    POSTGRES_PASSWORD: getString('POSTGRES_PASSWORD', process.env.POSTGRES_PASSWORD),
    POSTGRES_DB: getString('POSTGRES_DB', process.env.POSTGRES_DB),
    FLASK_SECRET_KEY: getString('FLASK_SECRET_KEY', process.env.FLASK_SECRET_KEY),
    telegraf: <ITelegrafConfig>getObject('telegraf', process.env.telegraf),
    recaptchaSecret: getString('recaptchaSecret', process.env.recaptchaSecret),
    god: <IGod>getObject('god', process.env.god),
    firebase: <IFirebaseConfig>getObject('firebase', process.env.firebase),
}













/* Retrievers */



/**
 * Retrieves a boolean value.
 * @param key 
 * @param val 
 * @returns boolean
 */
function getBoolean(key: string, val: string): boolean {
    isPropertySet(key, val);
    return val == 'true';
}




/**
 * Retrieves a string value.
 * @param key 
 * @param val 
 * @returns string
 */
function getString(key: string, val: string): string {
    isPropertySet(key, val);
    return val;
}




/**
 * Retrieves a number value. If the value is NaN it will throw an error.
 * @param key 
 * @param val 
 * @returns number
 */
 function getNumber(key: string, val: string): number {
    isPropertySet(key, val);
    const numberVal: number = Number(val);
    if (numberVal == NaN) throw new Error(`Environment: The property ${key} is not a valid number.`);
    return numberVal;
}





/**
 * Retrieves an object value.
 * @param key 
 * @param val 
 * @returns object
 */
 function getObject(key: string, val: string): object {
    isPropertySet(key, val);
    try { return JSON.parse(val) } 
    catch (e) {
        console.error(e);
        throw new Error(`Environment: The property ${key} is not a valid object.`);
    }
}






/**
 * Makes sure that the properties set on the machine's environment
 * are valid strings, otherwise throws an error.
 * @param key 
 * @param val 
 * @returns void
 */
function isPropertySet(key: string, val: string): void { if (typeof val != "string" || !val.length) throw new Error(`Environment: The property ${key} is not a valid string.`) }














/**
 * Environment Variables Export
 * The variable environment can be accessed from any section of the API
 */
export { environment };