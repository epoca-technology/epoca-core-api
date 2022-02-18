// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';


// Init Utils
import {  IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Auth
import { IAuthService, IAuthModel } from "../../src/modules/auth";
const _service = appContainer.get<IAuthService>(SYMBOLS.AuthService);
const _model = appContainer.get<IAuthModel>(SYMBOLS.AuthModel);



// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');



describe('Auth:', async function() {

    it('-', async function() {

    });
});









