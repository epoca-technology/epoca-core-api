// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';
import {BigNumber} from 'bignumber.js';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Moment Timezone
import * as momenttz from 'moment-timezone';

// Utilities Service
import { IAPIResponse, IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Validations Service
import { IValidationsService } from "../../src/modules/validations";
const _validations = appContainer.get<IValidationsService>(SYMBOLS.ValidationsService);




/* Number Handling */
describe('Number Handling:', function() {

    it('-Can increase numbers by percentage', function() {
        // Init a list of numbers
        const vals: {originalNumber: number, percent: number, result: number}[] = [
            {originalNumber: 100, percent: 50, result: 150},
            {originalNumber: 100, percent: 100, result: 200},
            {originalNumber: 57700, percent: 1, result: 58277},
            {originalNumber: 57700, percent: 3.95, result: 59979.15},
        ];

        for (let v of vals) {
            expect(_utils.alterNumberByPercentage(v.originalNumber, v.percent)).toEqual(v.result);
            expect(_utils.calculatePercentageChange(v.originalNumber, v.result)).toEqual(v.percent);
        }
    });




    it('-Can decrease numbers by percentage', function() {
        // Init a list of numbers
        const vals: {originalNumber: number, percent: number, result: number}[] = [
            {originalNumber: 100, percent: -50, result: 50},
            {originalNumber: 100, percent: -90, result: 10},
            {originalNumber: 57700, percent: -2, result: 56546},
            {originalNumber: 56936.63, percent: -35, result: 37008.80},
        ];

        for (let v of vals) {
            expect(_utils.alterNumberByPercentage(v.originalNumber, v.percent)).toEqual(v.result);
            expect(_utils.calculatePercentageChange(v.originalNumber, v.result)).toEqual(v.percent);
        }
    });




    it('-Can calculate the average value from a list of numbers', function() {
        expect(_utils.calculateAverage([100,200,300,400,500])).toEqual(300);
        expect(_utils.calculateAverage([100.54,201.69,302.55,988.25,631.12])).toEqual(444.83);
    });



    it('-Can calculate the percentage change between 2 numbers', function() {
        expect(_utils.calculatePercentageChange(100, 50, {of: 's'})).toEqual('-50');
        expect(_utils.calculatePercentageChange(100, 150, {of: 's'})).toEqual('50');
        expect(_utils.calculatePercentageChange(100, 100, {of: 's'})).toEqual('0');
    });


    it('-Can get the percent out of a number total', function() {
        expect(_utils.calculatePercentageOutOfTotal(50, 100)).toEqual(50);
        expect(_utils.calculatePercentageOutOfTotal(100, 1000)).toEqual(10);
        expect(_utils.calculatePercentageOutOfTotal(30, 100)).toEqual(30);
    });


    it('-Can round numbers in any format', function() {
        expect(_utils.outputNumber(1.5, {dp: 0})).toEqual(1);
        expect(_utils.outputNumber('1.5', {dp: 0, ru: true})).toEqual(2);
        expect(_utils.outputNumber('1.01', {dp: 0, ru: true})).toEqual(2);
        expect(_utils.outputNumber(new BigNumber(1.555), {dp: 2, ru: true})).toEqual(1.56);
        expect(_utils.outputNumber(new BigNumber(1.555), {dp: 2})).toEqual(1.55);
    });

    

    it('-Can calculate a fee', function() {
        expect(_utils.calculateFee(1000, 1)).toEqual(10);
        expect(_utils.calculateFee(300, 10)).toEqual(30);
        expect(_utils.calculateFee(100, 35)).toEqual(35);
    });




    it('-Can determine if two numbers are close to eachother', function() {
        expect(_utils.closeEnough(1, 2, 1)).toBeTruthy();
        expect(_utils.closeEnough(1, 2.1, 1)).toBeFalsy();
        expect(_utils.closeEnough(1, 10, 9)).toBeTruthy();
        expect(_utils.closeEnough(1, 11, 9)).toBeFalsy();
    });



    it('-Can retrieve a BigNumber from a number, string or BigNumber Instance', function() {
        expect(_utils.getBigNumber(100).toNumber()).toEqual(100);
        expect(_utils.getBigNumber('100').toNumber()).toEqual(100);
        const bn: BigNumber = new BigNumber(100.55);
        expect(_utils.getBigNumber(bn).toNumber()).toEqual(100.55);
    });
});







/* UUID */
describe('UUID:', function() {
    it('-Can generate valid v4 uuids', function() {
        // Generate the first uuid
        const uuid1: string = _utils.generateID();
        expect(typeof uuid1).toBe("string");
        expect(uuid1.length).toBe(36);
        expect(_validations.uuidValid(uuid1)).toBeTruthy();

        // Generate the second uuid
        const uuid2: string = _utils.generateID();
        expect(typeof uuid2).toBe("string");
        expect(uuid2.length).toBe(36);
        expect(_validations.uuidValid(uuid2)).toBeTruthy();

        // Make sure both are different
        expect(uuid1 == uuid2).toBeFalsy();
    });



    it('-Can validate uuids', function() {
        expect(_validations.uuidValid('109156be-c4fb-41ea-b1b4-efe1671c5836')).toBeTruthy();
        expect(_validations.uuidValid('d9428888-122b-11e1-b85c-61cd3cbb3210')).toBeFalsy(); // v1 uuid
        expect(_validations.uuidValid('')).toBeFalsy();
        expect(_validations.uuidValid('asdasdasdsad1564sd654a6s1da23sdasd4')).toBeFalsy();
        // @ts-ignore
        expect(_validations.uuidValid(45432123132)).toBeFalsy();
    });
});











/* API Response */
describe('API Response:', function() {

    /* API Response Building */
    it('-Can build a standard API Response:', function() {
        const r: IAPIResponse = _utils.apiResponse();
        expect(r.success).toBeTruthy();
        expect(r.data).toBe(undefined);
        expect(r.error).toBe(undefined);
    });

    it('-Can build an API Response with data (number):', function() {
        const r: IAPIResponse = _utils.apiResponse(5);
        expect(r.success).toBeTruthy();
        expect(r.data).toBe(5);
        expect(r.error).toBe(undefined);
    });


    it('-Can build an API Response with data (string):', function() {
        const r: IAPIResponse = _utils.apiResponse('Hello World!');
        expect(r.success).toBeTruthy();
        expect(r.data).toBe('Hello World!');
        expect(r.error).toBe(undefined);
    });



    it('-Can build an API Response with data (object):', function() {
        const r: IAPIResponse = _utils.apiResponse({a: 'Foo', b: 'Baz', c: 'Bar', d: 5, e: {hello: 'World'}});
        expect(r.success).toBeTruthy();
        expect(stringify(r.data)).toBe(stringify({a: 'Foo', b: 'Baz', c: 'Bar', d: 5, e: {hello: 'World'}}));
        expect(r.error).toBe(undefined);
    });




    /* API Error Building */
    it('-Can build an error with a code:', function() {
        const r: string = _utils.buildApiError('Nasty Error mate! :(', 101);
        expect(r).toBe('Nasty Error mate! :( {(101)}');
    });

    it('-Can build an error without providing a code:', function() {
        const r: string = _utils.buildApiError('Unknown Nasty Error mate! :(');
        expect(r).toBe('Unknown Nasty Error mate! :( {(0)}');
    });


    /* API Error Code Extraction */
    it('-Can extract an error code from a string:', function() {
        expect(_utils.getCodeFromApiError(_utils.buildApiError('Nasty Error mate! :(', 101))).toBe(101);
        expect(_utils.getCodeFromApiError('Another random error {(5)}')).toBe(5);
        expect(_utils.getCodeFromApiError('Another random error')).toBe(0);
        expect(_utils.getCodeFromApiError(_utils.buildApiError('Nasty Error mate among some other seuff! :(', 2669))).toBe(2669);
    });


    it('-Can extract an error code from an error instance:', function() {
        try {
            throw new Error(_utils.buildApiError('Ops this is another error...', 404));
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(404)
        }
    });
});











/* Error Handling */
describe('Error Handling:', function() {
    it('-Can retrieve an error message from a string.', function() {
        const test: string = 'Hey, this is a nasty error!!!!';
        expect(_utils.getErrorMessage(test)).toEqual(test);
    });

    it('-Can retrieve an error instance.', function() {
        const test: string = 'Hey, this is a nasty error!!!!';
        try {
            throw new Error(test)
        } catch (e) {
            expect(_utils.getErrorMessage(e)).toEqual(test);
        }
    });

    it('-Can retrieve an error message from an unknown object.', function() {
        const test: any = {foo: 'bar', mez: 'can', liz: 1};
        const obj: any = _utils.getErrorMessage(test);
        const newObj: any = JSON.parse(obj);
        expect(newObj.foo).toEqual(test.foo);
        expect(newObj.mez).toEqual(test.mez);
        expect(newObj.liz).toEqual(test.liz);
    });
});










/* Conversions Handling */
describe('Conversions Handling: ', function() {

    it('-Can convert bytes into gigabytes: ', function() {
        expect(_utils.fromBytesToGigabytes(1e+9)).toBe(1)
        expect(_utils.fromBytesToGigabytes(2.85e+9)).toBe(2.85)
        expect(_utils.fromBytesToGigabytes(6.8513e+11)).toBe(685.13)
    });




    it('-Can convert seconds into hours: ', function() {
        expect(_utils.fromSecondsToHours(60)).toBe(0.01);
        expect(_utils.fromSecondsToHours(3600)).toBe(1);
        expect(_utils.fromSecondsToHours(57060)).toBe(15.85);
    });
});











/* Date Handling */
describe('Date Handling:', function() {
    beforeAll(() => { momenttz.tz.setDefault("America/Caracas") });
    it('-Can retrieve a timestamp from a string date.', function() {
        expect(_utils.getTimestamp('17-12-2021')).toEqual(1639713600000);
        expect(_utils.getTimestamp('17-08-2017')).toEqual(1502942400000);
        expect(_utils.getTimestamp('11-08-2020')).toEqual(1597118400000);
    });
});

