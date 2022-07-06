// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';
import { authenticator } from 'otplib';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Init Utils
import {  IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Init Auth
import { IAuthService, IAuthModel, IUser, IUserRecord, IAuthValidations } from "../../src/modules/auth";
const _service = appContainer.get<IAuthService>(SYMBOLS.AuthService);
const _model = appContainer.get<IAuthModel>(SYMBOLS.AuthModel);
const _validations = appContainer.get<IAuthValidations>(SYMBOLS.AuthValidations);

// Init Test Helper
import { AuthTestHelper } from "./AuthTestHelper";
const _test = new AuthTestHelper();

// Increase Timeout Interval prevent external requests from timing out
jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;

// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');




/* USER CREATION */
describe('User Creation:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Cannot create a user when providing invalid data: ', async function() {
        // Email
        try {
            await _service.createUser('asdasd', 4);
            fail('Should have not created a user with an invalid email (1).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8500) }

        try {
            await _service.createUser('asdasd@@@aaa324ds%#24', 1);
            fail('Should have not created a user with an invalid email (2).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8500) }

        // Authority
        try {
            await _service.createUser('test1@gmail.com', 5);
            fail('Should have not created a user with an invalid authority (1).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }

        try {
            // @ts-ignore
            await _service.createUser('test1@gmail.com', 0);
            fail('Should have not created a user with an invalid authority (2).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }

        try {
            // @ts-ignore
            await _service.createUser('test1@gmail.com', 6);
            fail('Should have not created a user with an invalid authority (3).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }
    });




    it('-Cannot create a user if the email is already registered: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Attempt to register the same user again
        try {
            await _test.createTestUser(0);
            fail('Should have not created a user with an email that is already in use.');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8502) }
    });




    it('-Can create users, validate the data integrity, update the password and verify credentials: ', async function() {
        // Iterate over each test user
        for (let i = 0; i < _test.users.length; i++) {
            // Create a user
            const uid: string = await _test.createTestUser(i);

            // Retrieve the user record from the db and firebase
            let user: IUser|undefined = await _model.getUser(uid);
            let firebaseUser: IUserRecord|undefined = await _model.getFirebaseUserRecord(uid);

            // Make sure it exists in both,  the DB and Firebase
            expect(user === undefined).toBeFalsy();
            expect(firebaseUser === undefined).toBeFalsy();

            // Validate the DB Integrity
            expect(uid == user!.uid).toBeTruthy();
            expect(typeof uid == "string").toBeTruthy();
            expect(user!.email).toBe(_test.users[i].email);
            expect(user!.authority).toBe(_test.users[i].authority);
            expect(typeof user!.otp_secret == "string").toBeTruthy();
            expect(user!.fcm_token == undefined).toBeTruthy();
            expect(typeof user!.creation == "number").toBeTruthy();

            // Validate the Firebase User's Integrity
            expect(firebaseUser!.uid).toBe(uid);
            expect(firebaseUser!.email).toBe(_test.users[i].email);

            // Make sure the user was added to the local authorities object
            // @ts-ignore
            expect(_service.authorities[uid]).toBe(_test.users[i].authority);

            // If the user is retrieved by email should be exactly the same as the one retrieved by uid
            let userByEmail: IUser|undefined = await _model.getUserByEmail(_test.users[i].email);
            expect(stringify(user) == stringify(userByEmail)).toBeTruthy();

            // Set a new password on the account
            let otpToken: string = authenticator.generate(user!.otp_secret);
            await _service.updatePassword(_test.users[i].email, _test.users[i].password, otpToken, '');

            // Verify the credentials
            otpToken = authenticator.generate(user!.otp_secret);
            const signInToken: string = await _service.getSignInToken(_test.users[i].email, _test.users[i].password, otpToken, '');
            expect(typeof signInToken).toBe("string");

            // Delete the user
            await _service.deleteUser(uid);

            // Retrieve the user record from the db and firebase again
            user = await _model.getUser(uid);
            userByEmail = await _model.getUserByEmail(_test.users[i].email);
            firebaseUser = await _model.getFirebaseUserRecord(uid);

            // Both of them should be undefined
            expect(user).toBe(undefined);
            expect(userByEmail).toBe(undefined);
            expect(firebaseUser).toBe(undefined);

            // The user should have also been removed from the local authorities
            // @ts-ignore
            expect(_service.authorities[uid]).toBe(undefined);
        }
    });
});







/* USER EMAIL UPDATE */
describe('User Email Update:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Can create an user, verify the credentials, update the email and reverify the credentials with the new email: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Retrieve the user record from the db and firebase
        let user: IUser|undefined = await _model.getUser(uid);
        let firebaseUser: IUserRecord|undefined = await _model.getFirebaseUserRecord(uid);
        expect(user == undefined).toBeFalsy();
        expect(firebaseUser === undefined).toBeFalsy();

        // Make sure both emails match
        expect(user!.email).toBe(firebaseUser!.email!);

        // Set a new password on the account
        let otpToken: string = authenticator.generate(user!.otp_secret);
        await _service.updatePassword(_test.users[0].email, _test.users[0].password, otpToken, '');

        // Verify the credentials
        otpToken = authenticator.generate(user!.otp_secret);
        let signInToken: string = await _service.getSignInToken(_test.users[0].email, _test.users[0].password, otpToken, '');
        expect(typeof signInToken).toBe("string");

        // Update the email
        await _service.updateEmail(uid, _test.users[1].email);

        // Retrieve the user record from the db and firebase again
        user = await _model.getUser(uid);
        firebaseUser = await _model.getFirebaseUserRecord(uid);
        expect(user == undefined).toBeFalsy();
        expect(user!.email).toBe(_test.users[1].email);
        expect(firebaseUser === undefined).toBeFalsy();
        expect(firebaseUser!.email).toBe(_test.users[1].email);

        // Verify the credentials again
        otpToken = authenticator.generate(user!.otp_secret);
        signInToken = await _service.getSignInToken(_test.users[1].email, _test.users[0].password, otpToken, '');
        expect(typeof signInToken).toBe("string");
    });



    it('-Cannot update an email if a uid is not in the db: ', async function() {
        try {
            await _service.updateEmail(_utils.generateID(), _test.users[0].email);
            fail('It should have not updated the email with a non-existant uid.');
        } catch (e) {  expect(_utils.getCodeFromApiError(e)).toBe(8503) }
    });




    it('-Cannot update an email with invalid data: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        try {
            await _service.updateEmail(uid, 'sadasdasd');
            fail('Should have not updated the email with invalid data (1).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8500) }

        try {
            await _service.updateEmail(uid, 'sadasdasd@asdasd@sadasd');
            fail('Should have not updated the email with invalid data (2).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8500) }

        try {
            // @ts-ignore
            await _service.updateEmail(uid, 12312354234123);
            fail('Should have not updated the email with invalid data (3).');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8500) }
    });



    it('-Cannot set an email that is already being used: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);
        const uid2: string = await _test.createTestUser(1);

        try {
            await _service.updateEmail(uid, _test.users[1].email);
            fail('Should have not set an email that already existed.');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8502) }
    });
});







/* USER PASSWORD UPDATE */
describe('User Password Update:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Can create an user, verify the credentials, update the password and reverify the credentials with the new password: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Retrieve the user record from the db
        let user: IUser|undefined = await _model.getUser(uid);

        // Set a new password on the account
        let otpToken: string = authenticator.generate(user!.otp_secret);
        await _service.updatePassword(_test.users[0].email, _test.users[0].password, otpToken, '');

        // Verify the credentials
        otpToken = authenticator.generate(user!.otp_secret);
        let signInToken: string = await _service.getSignInToken(_test.users[0].email, _test.users[0].password, otpToken, '');
        expect(typeof signInToken).toBe("string");

        // Set a new password on the account again
        otpToken = authenticator.generate(user!.otp_secret);
        await _service.updatePassword(_test.users[0].email, _test.users[1].password, otpToken, '');

        // Verify the credentials again
        otpToken = authenticator.generate(user!.otp_secret);
        signInToken = await _service.getSignInToken(_test.users[0].email, _test.users[1].password, otpToken, '');
        expect(typeof signInToken).toBe("string");
    });


    it('-Cannot set a password on a uid that does not exist: ', async function() {
        try { 
            await _service.updatePassword('asd@asd.com', 'SomePassword123', '123456', '')
            fail('It should have not updated the password of a uid that doesnt exist.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8503) }
    });



    it('-Cannot set an invalid password: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        try { 
            await _service.updatePassword(_test.users[0].email, 'invalidpassword', '123456', '')
            fail('It should have not set an invalid password.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8505) }
    });


    it('-Can only update the password by providing a valid OTP Token: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);
        const uid2: string = await _test.createTestUser(1);

        try { 
            await _service.updatePassword(_test.users[0].email, 'SomeValidPassword123456', '123456', '')
            fail('It should have not set a new password with an invalid OTP (1).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8302) }

        // Generate a token for the second user
        const user: IUser|undefined = await _model.getUser(uid2);
        const secondUserOTP: string = authenticator.generate(user!.otp_secret);
        try { 
            await _service.updatePassword(_test.users[0].email, 'SomeValidPassword123456', secondUserOTP, '')
            fail('It should have not set a new password with an invalid OTP (1).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8302) }
    });
});







/* USER OTP SECRET UPDATE */
describe('User OTP SECRET Update:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Can create an user, verify an otp token, update the secret and verify again: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Retrieve the user record from the db
        let user: IUser|undefined = await _model.getUser(uid);
        const originalSecret: string = user!.otp_secret;

        // Validate the token
        let otpToken: string = authenticator.generate(originalSecret);
        await _service.validateOTPToken(uid, otpToken);

        // Update the secret
        await _service.updateOTPSecret(uid);

        // Retrieve the user again
        user = await _model.getUser(uid);

        // Make sure the secret changed
        expect(originalSecret == user!.otp_secret).toBeFalsy();

        // Validate a new token
        otpToken = authenticator.generate(user!.otp_secret);
        await _service.validateOTPToken(uid, otpToken);
    });



    it('-Cannot update the OTP Secret for a uid that does not exist: ', async function() {
        try { 
            await _service.updateOTPSecret(_utils.generateID());
            fail('It should have not updated the OTP Secret for a uid that doesnt exist.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8506) }
    });




    it('-Can identify invalid/expired OTP Tokens: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        try { 
            await _service.validateOTPToken(uid, '111111');
            fail('It should have not validated an invalid OTP Token (1).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8302) }

        try { 
            await _service.validateOTPToken(uid, '999999');
            fail('It should have not validated an invalid OTP Token (2).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8302) }

        try { 
            await _service.validateOTPToken(uid, '999');
            fail('It should have not validated an invalid OTP Token (3).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8510) }


        try { 
            //@ts-ignore
            await _service.validateOTPToken(uid, 123456);
            fail('It should have not validated an invalid OTP Token (4).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8510) }
    });
});









/* USER AUTHORITY UPDATE */
describe('User Authority Update:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Can create an user and update its authority: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Retrieve the user record from the db
        let user: IUser|undefined = await _model.getUser(uid);

        // Make sure the authority matches
        expect(user!.authority).toBe(_test.users[0].authority);

        // Make sure it matches the local object
            // @ts-ignore
        expect(_service.authorities[uid]).toBe(_test.users[0].authority);

        // Update it
        await _service.updateAuthority(uid, 1);

        // Retrieve the user again
        user = await _model.getUser(uid);

        // Make sure the changes took effect
        expect(user!.authority).toBe(1);

        // Make sure it matches the local object
        // @ts-ignore
        expect(_service.authorities[uid]).toBe(1);
    });


    it('-Cannot update the Authority for a uid that does not exist: ', async function() {
        try { 
            await _service.updateAuthority(_utils.generateID(), 3);
            fail('It should have not updated the Authority for a uid that doesnt exist.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8503) }
    });



    it('-Cannot set invalid authorities: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        try { 
            await _service.updateAuthority(uid, _test.users[0].authority);
            fail('It should have not updated the Authority with the same value.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8507) }

        try { 
            // @ts-ignore
            await _service.updateAuthority(uid, 0);
            fail('It should have not updated the Authority with an invalid value (1).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }

        try { 
            await _service.updateAuthority(uid, 5);
            fail('It should have not updated the Authority with an invalid value (2).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }

        try { 
            // @ts-ignore
            await _service.updateAuthority(uid, 6);
            fail('It should have not updated the Authority with an invalid value (3).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8501) }
    });



    it('-Can create and identify if it is authorized to perform actions: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Cannot verify the authority with a non existent uid
        try {
            _service.isUserAuthorized('someRandomUid', 4);
            fail('It should have not authorized a uid that does not exist.');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8001) }


        // Can identify if the user cannot perform an action
        try {
            _service.isUserAuthorized(uid, 5);
            fail('It should have not authorized a uid that does not have sufficient authority.');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8002) }

        // Can identify the user is authorized
        _service.isUserAuthorized(uid, 4);
    });
});












/* USER FCM TOKEN UPDATE */
describe('User FCM Token Update:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });

    it('-Can create an user and update its FCM Token: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Update the token
        await _service.updateFCMToken(uid, _test.fcmTokens[0]);

        // Retrieve the user record from the db
        let user: IUser|undefined = await _model.getUser(uid);
        const originalToken: string|undefined = user!.fcm_token;

        // The FCM Token must now match
        expect(originalToken).toBe(_test.fcmTokens[0]);

        // Retrieve the list of tokens and make sure it is there
        let tokens: string[] = await _service.getFCMTokens();
        expect(tokens.includes(originalToken!)).toBeTruthy();

        // Update the token again
        await _service.updateFCMToken(uid, _test.fcmTokens[1]);

        // Retrieve the user record from the db again
        user = await _model.getUser(uid);

        // The FCM Token must match the new one
        expect(user!.fcm_token).toBe(_test.fcmTokens[1]);

        // Retrieve the list of tokens and make sure it is there and the old one isn't
        tokens = await _service.getFCMTokens();
        expect(tokens.includes(user!.fcm_token!)).toBeTruthy();
        expect(tokens.includes(originalToken!)).toBeFalsy();
    });



    it('-Cannot update the FCM Token for a uid that does not exist or is invalid: ', async function() {
        try { 
            await _service.updateFCMToken('SomeInvalidUUID', '');
            fail('It should have not updated the FCM Token with an invalid uid.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8504) }

        try { 
            await _service.updateFCMToken(_utils.generateID(), _test.fcmTokens[0]);
            fail('It should have not updated the FCM Token for a uid that doesnt exist.')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8506) }
    });



    it('-Cannot update the FCM Token with invalid data: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        try { 
            await _service.updateFCMToken(uid, '');
            fail('It should have not updated the FCM Token with invalid format (1).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8508) }

        try { 
            await _service.updateFCMToken(uid, 'asadasdjasdkl;ajsdkl;ahskjglkjasbdkjashdjkhgasjdjhkasgdjhkagsdjhkgasjhkdgkjasdbmansdb,mhagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asdagsdkjlasgbdabsdjkhgaskdkljahsbgdlasbdm,nasdb,hgasdasdsdasdasddas564d1a3s2d12as4d5a4sd564asd3541as23d14a3s4d56as4d65as4d65as4d56a4sd32as51d3as1d32as4d34asd');
            fail('It should have not updated the FCM Token with invalid format (2).')
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8508) }
    });
});











/* USER CREDENTIALS VERIFICATION UPDATE */
describe('User Credentials Verification:', async function() {
    beforeEach(async () => { await _test.deleteTestUsers() });
    afterAll(async () => { await _test.deleteTestUsers() });


    it('-Can create a user and verify the credentials: ', async function() {
        // Create the user
        const uid: string = await _test.createTestUser(0);

        // Verify incorrect credentials
        try {
            // @ts-ignore
            await _validations.verifyCredentials(_test.users[0].email, 'SomeInvalidPassword123465');
        } catch (e) { expect(_utils.getCodeFromApiError(e)).toBe(8512) }

        // Retrieve the user record from the db
        let user: IUser|undefined = await _model.getUser(uid);

        // Set a new password on the account
        let otpToken: string = authenticator.generate(user!.otp_secret);
        await _service.updatePassword(_test.users[0].email, _test.users[0].password, otpToken, '');

        // Verify the correct credentials
        //@ts-ignore
        await _validations.verifyCredentials(_test.users[0].email, _test.users[0].password);
    });
});