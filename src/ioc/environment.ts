/* Interfaces */
export interface IEnvironment {
    production: boolean,
    PGHOST: string,
    PGUSER: string,
    PGPASSWORD: string,
    PGDATABASE: string,
    PGPORT: number,
    telegraf: ITelegrafConfig,
    recaptchaSecret: string,
    god: IGod,
    firebaseServiceAccount: IFirebaseServiceAccount,
}


// Telegraph
export interface ITelegrafConfig {
    token: string,
    chatID: number
}


// God User
export interface IGod {
    email: string,
    password: string,
    otpSecret: string
}


// Firebase Service Account
export interface IFirebaseServiceAccount { 
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
}










/**
 * Initializer
 * Attempts to populate each environment variable. If there is any
 * kind of issue it will crash the server startup.
 */
const environment: IEnvironment = {
    production: getBoolean('production', process.env.production),
    PGHOST: getString('PGHOST', process.env.PGHOST),
    PGUSER: getString('PGUSER', process.env.PGUSER),
    PGPASSWORD: getString('PGPASSWORD', process.env.PGPASSWORD),
    PGDATABASE: getString('PGDATABASE', process.env.PGDATABASE),
    PGPORT: getNumber('PGPORT', process.env.PGPORT),
    telegraf: <ITelegrafConfig>getObject('telegraf', process.env.telegraf),
    recaptchaSecret: getString('recaptchaSecret', process.env.recaptchaSecret),
    god: <IGod>getObject('god', process.env.god),
    firebaseServiceAccount: <IFirebaseServiceAccount>getObject('firebaseServiceAccount', process.env.firebaseServiceAccount),
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