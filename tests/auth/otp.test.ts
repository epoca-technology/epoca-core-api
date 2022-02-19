// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';
import * as moment from 'moment';
import MockDate from 'mockdate';
import { authenticator } from 'otplib';


// Init Validations
import {  IValidationsService } from "../../src/modules/utilities";
const _validations = appContainer.get<IValidationsService>(SYMBOLS.ValidationsService);



// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');






describe('OTP Management:', async function() {
    // Reset the date mocks
    beforeEach(() => { MockDate.reset() });
    afterAll(() => {  MockDate.reset() });


    it('-Can generate a valid secret and a valid token: ', function() {
        // Generate the secret
        const secret: string = authenticator.generateSecret();
        expect(typeof secret).toBe("string");
        expect(secret.length >= 5).toBeTruthy();
        expect(secret.length <= 60).toBeTruthy();

        // Generate the token
        const token: string = authenticator.generate(secret);
        expect(_validations.otpTokenValid(token)).toBeTruthy();

        // Validate the token
        expect(authenticator.check(token, secret)).toBeTruthy();
    });



    it('-Generates a new token every ~30 seconds: ', function() {
        // Generate the secret
        const secret: string = authenticator.generateSecret();

        // Generate the first token
        const token1: string = authenticator.generate(secret);

        // Generate the second token on the next window
        MockDate.set(moment().add(31, "seconds").valueOf());
        const token2: string = authenticator.generate(secret);

        // Both tokens must be different
        expect(token1 == token2).toBeFalsy();

        // Generate a third token and make sure it is different from the previous ones
        MockDate.set(moment().add(31, "seconds").valueOf());
        const token3: string = authenticator.generate(secret);
        expect(token1 == token3).toBeFalsy();
        expect(token2 == token3).toBeFalsy();
    });



    it('-Can generate a valid token and use it for 2 windows: ', function() {
        // Generate the secret
        const secret: string = authenticator.generateSecret();

        // Generate the token
        const token: string = authenticator.generate(secret);

        // Should be valid for the current minute
        expect(authenticator.check(token, secret)).toBeTruthy();

        // Should also be valid ~60 seconds from now (2 windows)
        MockDate.set(moment().add(59, "seconds").valueOf());
        expect(authenticator.check(token, secret)).toBeTruthy();

        // It should be invalid after the 2 windows
        MockDate.set(moment().add(30, "seconds").valueOf());
        expect(authenticator.check(token, secret)).toBeFalsy();
    });
});








