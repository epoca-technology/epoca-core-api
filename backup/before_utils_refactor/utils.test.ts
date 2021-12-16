// Dependencies
import "reflect-metadata";
import {appContainer} from '../../src/ioc';
import {BigNumber} from 'bignumber.js';
import { SYMBOLS } from "../../src/types";


// Init service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);







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
        expect(_utils.calculatePercentageChange(100, 50)).toEqual(-50);
        expect(_utils.calculatePercentageChange(100, 150)).toEqual(50);
        expect(_utils.calculatePercentageChange(100, 100)).toEqual(0);
    });


    it('-Can get the percent out of a number total', function() {
        expect(_utils.calculatePercentageOutOfTotal(50, 100)).toEqual(50);
        expect(_utils.calculatePercentageOutOfTotal(100, 1000)).toEqual(10);
        expect(_utils.calculatePercentageOutOfTotal(30, 100)).toEqual(30);
    });


    it('-Can round numbers in any format', function() {
        expect(_utils.roundNumber(1.5, 0)).toEqual(1);
        expect(_utils.roundNumber('1.5', 0, true)).toEqual(2);
        expect(_utils.roundNumber(new BigNumber(1.555), 2, true)).toEqual(1.56);
        expect(_utils.roundNumber(new BigNumber(1.555), 2)).toEqual(1.55);
    });



    it('-Can retrieve the correct number of decimals', function() {
        expect(_utils.getDecimalPlaces()).toEqual(2);
        expect(_utils.getDecimalPlaces(0)).toEqual(0);
        expect(_utils.getDecimalPlaces(3)).toEqual(3);
    });



    it('-Can retrieve the correct rounding mode', function() {
        expect(_utils.getRoundingMode()).toEqual(1);
        expect(_utils.getRoundingMode(false)).toEqual(1);
        expect(_utils.getRoundingMode(true)).toEqual(0);
    });



    it('-Can retrieve a BigNumber from a number, string or BigNumber Instance', function() {
        expect(_utils.getBigNumber(100).toNumber()).toEqual(100);
        expect(_utils.getBigNumber('100').toNumber()).toEqual(100);
        const bn: BigNumber = new BigNumber(100.55);
        expect(_utils.getBigNumber(bn).toNumber()).toEqual(100.55);
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