// Dependencies
import "reflect-metadata";
import {appContainer} from '../../src/ioc';
import { SYMBOLS } from "../../src/types";


// Init error service
/*import { IErrorService } from "../../src/modules/shared/error";
const _e = appContainer.get<IErrorService>(SYMBOLS.ErrorService);*/



describe('Error Message:', function() {
    it('-Can extract a message from an error instance.', function() {
        /*const msg: string = 'I am a nasty error!'
        try {
            throw new Error(msg);
        } catch (e) {
            expect(_e.getMessage(e)).toEqual(msg);
        }*/
    });

});