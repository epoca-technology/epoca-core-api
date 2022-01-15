// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';


// Validations Service
import { IValidationsService } from "../../src/modules/shared/validations";
const _validations = appContainer.get<IValidationsService>(SYMBOLS.ValidationsService);






describe('General Validations Tests:', function() {

    /* Numbers */

    it('-Can identify valid numbers: ', function() {
        expect(_validations.numberValid(1)).toBeTruthy();
        expect(_validations.numberValid(0)).toBeTruthy();
        expect(_validations.numberValid(-1)).toBeTruthy();
        expect(_validations.numberValid(2, 1, 3)).toBeTruthy();
        expect(_validations.numberValid(10, 5, 1000)).toBeTruthy();
    });

    it('-Can identify invalid number formats: ', function() {
        // @ts-ignore
        expect(_validations.numberValid('asdsad')).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid('123')).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid(true)).toBeFalsy();
        // @ts-ignore
        expect(_validations.numberValid({foo: 'bar'})).toBeFalsy();
    });


    it('-Can validate numbers within a range: ', function() {
        expect(_validations.numberValid(1, 2)).toBeFalsy();
        expect(_validations.numberValid(4, 1, 3)).toBeFalsy();
        expect(_validations.numberValid(3, 1, 3)).toBeTruthy();
        expect(_validations.numberValid(1500, 1501, 2000)).toBeFalsy();
    });






    /*  */





    /* UUID Validations Testing performed in utils.tests */
});











