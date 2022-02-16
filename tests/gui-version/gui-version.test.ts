// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';

// DB Service
import { IDatabaseService } from "../../src/modules/database";
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// GUI Version Service
import { IGuiVersionService } from "../../src/modules/gui-version";
const _version = appContainer.get<IGuiVersionService>(SYMBOLS.GuiVersionService);


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');


describe('General Validations Tests:', function() {


    it('-Can identify valid numbers: ', function() {

    });
});











