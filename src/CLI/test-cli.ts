// Dependencies 
import "reflect-metadata";
import { appContainer } from "../ioc";
import { SYMBOLS } from "../symbols";
import * as prompt from 'prompt';


// Init class
import { IErrorService } from "../modules/shared/error";
const _e = appContainer.get<IErrorService>(SYMBOLS.ErrorService);


// Initialize
console.log('TEST CLI');
console.log('@param message? // If none provided, it will output a default message');
console.log(' ');
prompt.start();

prompt.get(['message'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    try {
        throw data.message || 'You should have provided a message :)';
    } catch (e) {
        console.log(_e.getMessage(e));
    }
})