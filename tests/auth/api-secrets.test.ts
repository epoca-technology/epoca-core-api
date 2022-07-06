// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';
import * as moment from 'moment';
import MockDate from 'mockdate';
import * as stringify from 'json-stable-stringify';

// Init DB
import {  IDatabaseService, IDataSnapshot } from "../../src/modules/database";
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// Init Utils & Validations
import {  IUtilitiesService, IValidationsService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);
const _validations = appContainer.get<IValidationsService>(SYMBOLS.ValidationsService);


// Init API Secrets
import { IApiSecretService, IApiSecretRecord, IApiSecrets } from "../../src/modules/auth";
const _secret = appContainer.get<IApiSecretService>(SYMBOLS.ApiSecretService);



// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


// Increase Timeout Interval to not stop Firebase Requests
jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;


// Test Data
const uids: string[] = ['test-uid-1', 'test-uid-2'];





describe('API Secrets Management:', async function() {
    // Clean the DB and reset the secrets object
    beforeEach(async () => { 
        await Promise.all([
            _secret.removeSecret(uids[0]),
            _secret.removeSecret(uids[1]),
        ]);
    });
    afterAll(async () => { 
        await Promise.all([
            _secret.removeSecret(uids[0]),
            _secret.removeSecret(uids[1]),
        ]);
    });



    it('-Can add a secret, validate it, add another secret and finally remove both: ', async function() {
        /* First User Creation */

        // In the beginning, there was nothing
        const emptySecret1: IApiSecretRecord|null = await getSnapVal(uids[0]);
        expect(emptySecret1).toBe(null);

        // Add the first secret
        await _secret.refreshSecrets([uids[0]]);

        // Retrieve the snapshot and validate its properties
        let secret1: IApiSecretRecord|null = await getSnapVal(uids[0]);
        expect(_validations.apiSecretValid(secret1!.s)).toBeTruthy();
        expect(typeof secret1!.t).toBe("number");

        // Compare it to the secret stored in the local object
        // @ts-ignore
        expect(stringify(secret1) == stringify(_secret.secrets[uids[0]])).toBeTruthy();

        /* Second User Creation */

        // The second user should not have a secret
        const emptySecret2: IApiSecretRecord|null = await getSnapVal(uids[1]);
        expect(emptySecret2).toBe(null);

        // Add the second secret
        await _secret.refreshSecrets([uids[1]]);

        // Retrieve the snapshot and validate its properties
        let secret2: IApiSecretRecord|null = await getSnapVal(uids[1]);
        expect(_validations.apiSecretValid(secret2!.s)).toBeTruthy();
        expect(typeof secret2!.t).toBe("number");

        // Compare it to the secret stored in the local object
        // @ts-ignore
        expect(stringify(secret2) == stringify(_secret.secrets[uids[1]])).toBeTruthy();

        // The local object should have 2 keys for the 2 users
        // @ts-ignore
        let objKeys: string[] = Object.keys(_secret.secrets);
        expect(objKeys.length).toBe(2);
        expect(objKeys.includes(uids[0])).toBeTruthy();
        expect(objKeys.includes(uids[1])).toBeTruthy();

         /* First User Removal */

         // Remove the first secret
         await _secret.removeSecret(uids[0]);

        // Retrieve the snapshot and make sure it is empty
        secret1 = await getSnapVal(uids[0]);
        expect(secret1).toBe(null);

        // Make sure it has also been removed from the local object
        // @ts-ignore
        expect(_secret.secrets[uids[0]]).toBe(undefined);

        // The local object should have 1 key now
        // @ts-ignore
        objKeys = Object.keys(_secret.secrets);
        expect(objKeys.length).toBe(1);

        /* Second User Removal */

        // Remove the second secret
        await _secret.removeSecret(uids[1]);

        // Retrieve the snapshot and make sure it is empty
        secret2 = await getSnapVal(uids[1]);
        expect(secret2).toBe(null);

        // Make sure it has also been removed from the local object
        // @ts-ignore
        expect(_secret.secrets[uids[1]]).toBe(undefined);

        // The local object should be empty
        // @ts-ignore
        objKeys = Object.keys(_secret.secrets);
        expect(objKeys.length).toBe(0);
    });





    it('-Can add multiple secrets simultaneously: ', async function() {
        // Add the secrets
        await _secret.refreshSecrets(uids);

        // Retrieve the datasnapshot and make sure that both have been created
        const secrets: IApiSecrets = await getSnapVal();
        const keys: string[] = Object.keys(secrets);
        expect(keys.length >= 2).toBeTruthy();
        expect(keys.includes(uids[0])).toBeTruthy();
        expect(keys.includes(uids[1])).toBeTruthy();

        // Compare it to the secret stored in the local object
        // @ts-ignore
        expect(stringify(secrets[uids[0]]) == stringify(_secret.secrets[uids[0]])).toBeTruthy();
        // @ts-ignore
        expect(stringify(secrets[uids[1]]) == stringify(_secret.secrets[uids[1]])).toBeTruthy();
    });
});










describe('API Secret Verification:', async function() {
    // Clean the DB, reset the secrets object and reset the date mocks
    beforeEach(async () => { 
        await Promise.all([
            _secret.removeSecret(uids[0]),
            _secret.removeSecret(uids[1]),
        ]);
        MockDate.reset();
    });
    afterAll(async () => { 
        await Promise.all([
            _secret.removeSecret(uids[0]),
            _secret.removeSecret(uids[1]),
        ]);
        MockDate.reset();
    });



    it('-Can register a secret and verify it: ', async function() {
        // Register the secrets
        await _secret.refreshSecrets(uids);

        // Retrieve it from the db
        const record1: IApiSecretRecord = await getSnapVal(uids[0]);
        const record2: IApiSecretRecord = await getSnapVal(uids[1]);

        // Verify the first record
        try {
            await _secret.verifySecret(uids[0], record1.s);
        } catch (e) {
            console.log(e);
            fail('It should have been able to verify a valid secret (1).');
        }

        // Verify the second record
        try {
            await _secret.verifySecret(uids[1], record2.s);
        } catch (e) {
            console.log(e);
            fail('It should have been able to verify a valid secret (2).');
        }
    });




    it('-Can register, verify and renew a secret: ', async function() {
        // Register the secrets
        await _secret.refreshSecrets(uids);

        // Retrieve it from the db
        const record1: IApiSecretRecord = await getSnapVal(uids[0]);

        // Verify it
        await _secret.verifySecret(uids[0], record1.s);

        // Mock the time so it is identified as expired
        //@ts-ignore
        MockDate.set(moment().add(_secret.secretDuration + 1, "minutes").valueOf());

        // Verify it again so it renews
        await _secret.verifySecret(uids[0], record1.s);

        // Retrieve the newly generated record
        const record2: IApiSecretRecord = await getSnapVal(uids[0]);

        // Both secrets must be different
        expect(record1.s == record2.s).toBeFalsy();

        // Verify the new secret
        await _secret.verifySecret(uids[0], record2.s);
    });




    it('-Cannot verify a secret if it hasnt been registered: ', async function() {
        // Register the secret
        await _secret.refreshSecrets([uids[0]]);

        // Attempt to Verify it
        try {
            await _secret.verifySecret(uids[1], '1234567891');
            fail('It should have not verified the secret as the uid has not been registered.');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(9002);
        }
    });



    it('-Cannot verify a secret with an invalid format: ', async function() {
        // Register the secret
        await _secret.refreshSecrets([uids[0]]);

        // Attempt to Verify it
        try {
            await _secret.verifySecret(uids[0], '12345678910');
            fail('It should have not verified the secret as it is too long.');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(9003);
        }

        // Attempt to Verify it
        try {
            await _secret.verifySecret(uids[0], '123456');
            fail('It should have not verified the secret as it is too short.');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(9003);
        }
    });




    it('-Cannot verify a secret that is not equals to the one in the local object: ', async function() {
        // Register the secret
        await _secret.refreshSecrets([uids[0]]);

        // Attempt to Verify it
        try {
            await _secret.verifySecret(uids[0], '1234567891');
            fail('It should have not verified the secret as the uid has not been registered.');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(9004);
        }
    });




    it('-Can identify when a secret has expired: ', function() {
        // @ts-ignore
        const expiredTS: number = moment().subtract(_secret.secretDuration + 1, "minutes").valueOf();
        // @ts-ignore
        expect(_secret.secretExpired(expiredTS)).toBeTruthy();
    });
});










/**
 * Retrieves the secret snapshot currently stored in Firebase.
 * @param uid?
 * @returns Promise<IApiSecrets|IApiSecretRecord|null>
 */
async function getSnapVal(uid?: string): Promise<any> {
    let snap: IDataSnapshot;
    if (typeof uid == "string") {
        snap = await _db.apiSecretRef.child(uid).once('value');
    } else {
        snap = await _db.apiSecretRef.once('value');
    }
    return snap.val();
}