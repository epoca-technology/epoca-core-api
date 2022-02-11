// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';
import {BigNumber} from 'bignumber.js';

// Object Stringifier
import * as stringify from 'json-stable-stringify';


// Init service
import { IAPIResponse, IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');



describe('Trading Simulations Brainstorm:', function() {

    it('-', function() {

    });
});









