// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Init Utils
import { IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Init service
import { IApiError, IApiErrorService } from "../../src/modules/api-error";
const _apiError = appContainer.get<IApiErrorService>(SYMBOLS.ApiErrorService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


// Test Data
const origin: string = 'ApiError.UnitTests';
const uid: string = _utils.generateID();
const ip: string = '192.168.1.1';
const errorString: string = 'This is just an error string. A traditional error will look similar to this.';
let params: any = {param1: 'Hello', param2: 155, param3: {foo: 'bar'}};







describe('API Errors:', function() {
    beforeEach(async () => { await _apiError.deleteAll() });
    afterAll(async () => { await _apiError.deleteAll() });


    it('-Can store a series of API Errors and retrieve them: ', async function() {
        // There shouldnt be any errors stored
        let errors: IApiError[] = await _apiError.getAll();
        expect(errors.length).toBe(0);

        // Store the first error
        await _apiError.log(origin, errorString, uid, ip, params);

        // Retrieve the errors again and make sure they match
        errors = await _apiError.getAll();
        expect(errors.length).toBe(1);

        // Validate the integrity
        expect(errors[0].o).toBe(origin);
        expect(errors[0].e).toBe(errorString);
        expect(errors[0].uid).toBe(uid);
        expect(errors[0].ip).toBe(ip);
        expect(typeof errors[0].p).toBe("object");
        expect(stringify(errors[0].p) === stringify(params)).toBe(true);

        // Store a basic API error from an error instance
        try {
            throw new Error(errorString);
        } catch (e) {
            await _apiError.log(origin, e);
        }

        // Retrieve the errors again and make sure the second error has been aded
        errors = await _apiError.getAll();
        expect(errors.length).toBe(2);

        // Validate the second error's integrity
        expect(errors[0].o).toBe(origin);
        expect(errors[0].e).toBe(errorString);
        expect(errors[0].uid).toBe(null);
        expect(errors[0].ip).toBe(null);
        expect(errors[0].p).toBe(null);

        // Delete all the errors
        await _apiError.deleteAll();

        // Make sure they have been deleted
        errors = await _apiError.getAll();
        expect(errors.length).toBe(0);
    });




    it('-Can store an API Error with sensitive information in the params: ', async function() {
        // Init new params
        const newParams: any = {password: 'SomeCrazyPassword', newPassword: 'SomeOtherPassword', ...params};

        // Store the error
        await _apiError.log(origin, errorString, uid, ip, newParams);

        // Retrieve the error and validate its integrity
        let errors: IApiError[] = await _apiError.getAll();
        expect(errors.length).toBe(1);
        expect(errors[0].o).toBe(origin);
        expect(errors[0].e).toBe(errorString);
        expect(errors[0].uid).toBe(uid);
        expect(errors[0].ip).toBe(ip);
        expect(typeof errors[0].p).toBe("object");
        expect(errors[0].p.param1).toBe(params.param1);
        expect(errors[0].p.param2).toBe(params.param2);
        expect(typeof errors[0].p.param3).toBe("object");
        expect(errors[0].p.param3.foo).toBe("bar");
        expect(errors[0].p.password).toBe("[SENSITIVE_DATA_HIDDEN]");
        expect(errors[0].p.newPassword).toBe("[SENSITIVE_DATA_HIDDEN]");
    });





    it('-Can ommit certain errors and wont be saved in the DB: ', async function() {
        // Store the error
        await _apiError.log(origin, _utils.buildApiError('This error should not be saved into the DB.', 11000));

        // Retrieve the error and validate its integrity
        const errors: IApiError[] = await _apiError.getAll();
        expect(errors.length).toBe(0)
    });
});









