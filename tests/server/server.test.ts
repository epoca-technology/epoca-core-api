// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Init Server
import { IAlarmsConfig, IServerService } from "../../src/modules/server";
import { defaults } from "../../src/modules/server/defaults";
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);


// Init Utils
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Database
import { IDatabaseService, IQueryResult } from "../../src/modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);







describe('Server Brainstorm: ', function() {

    it('-', async function() {
        //await _server.initializeData();
    });
});












/* Alarms Management */
describe('Server Alarms Management:', async function() {
    // Init test mode
    beforeAll(() => { _server.testMode = true });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { await _db.query({text: `DELETE FROM ${_server.getAlarmsTable()};`}) });
    afterAll(async () => { 
        // Clean the DB
        await _db.query({text: `DELETE FROM ${_server.getAlarmsTable()};`})

        // Disable test mode
        _server.testMode = false;
    });




    it('-Can initialize the default alarms configuration: ', async function() {
        // In the beginning, there was nothing...
        const nothing: IAlarmsConfig|undefined = await getAlarmsSnapshot();
        expect(nothing).toBe(undefined);

        // Init the config
        await _server.setAlarmsConfiguration();

        // The default values should have been stored
        const something: IAlarmsConfig|undefined = await getAlarmsSnapshot();
        expect(stringify(something) === stringify(defaults.alarms)).toBeTruthy();
    });




    it('-Once the alarms have been initialized, the values can be updated: ', async function() {
        // Init the config
        await _server.setAlarmsConfiguration();

        // Update the config and make sure it matches
        let newConfig: IAlarmsConfig = buildAlarmsConfig({max_file_system_usage: 90});
        await _server.setAlarmsConfiguration(newConfig);
        let newConfigSnap: IAlarmsConfig|undefined = await getAlarmsSnapshot();
        expect(stringify(newConfigSnap) === stringify(newConfig)).toBeTruthy();
        //@ts-ignore
        expect(stringify(_server.alarms) === stringify(newConfig)).toBeTruthy();

        // Update all properties
        newConfig = buildAlarmsConfig({
            max_file_system_usage: 49,
            max_memory_usage: 65,
            max_cpu_load: 32,
            max_cpu_temperature: 76,
            max_gpu_load: 68,
            max_gpu_temperature: 55,
            max_gpu_memory_temperature: 50
        });
        await _server.setAlarmsConfiguration(newConfig);
        newConfigSnap = await getAlarmsSnapshot();
        expect(stringify(newConfigSnap) === stringify(newConfig)).toBeTruthy();

        // The local alarms should have been updated as well
        //@ts-ignore
        expect(stringify(_server.alarms) === stringify(newConfig)).toBeTruthy();
    });







    it('-Cannot set the alarms config with invalid values: ', async function() {
        try {
            //@ts-ignore
            await _server.setAlarmsConfiguration(true);
            fail('Should have not altered alarms config with invalid values. 1');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6300);
        }

        try {
            //@ts-ignore
            await _server.setAlarmsConfiguration("123456");
            fail('Should have not altered alarms config with invalid values. 2');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6300);
        }


        try {
            //@ts-ignore
            await _server.setAlarmsConfiguration({});
            fail('Should have not altered alarms config with invalid values. 3');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6301);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_file_system_usage: 29}));
            fail('Should have not altered alarms config with invalid values. 4');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6301);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_file_system_usage: 100}));
            fail('Should have not altered alarms config with invalid values. 5');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6301);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_memory_usage: 29}));
            fail('Should have not altered alarms config with invalid values. 6');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6302);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_memory_usage: 100}));
            fail('Should have not altered alarms config with invalid values. 7');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6302);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_cpu_load: 29}));
            fail('Should have not altered alarms config with invalid values. 8');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6303);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_cpu_load: 100}));
            fail('Should have not altered alarms config with invalid values. 9');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6303);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_cpu_temperature: 40}));
            fail('Should have not altered alarms config with invalid values. 10');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6304);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_cpu_temperature: 95}));
            fail('Should have not altered alarms config with invalid values. 11');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6304);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_load: 10}));
            fail('Should have not altered alarms config with invalid values. 12');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6305);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_load: 3565}));
            fail('Should have not altered alarms config with invalid values. 13');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6305);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_temperature: -55}));
            fail('Should have not altered alarms config with invalid values. 14');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6306);
        }

        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_temperature: 8456}));
            fail('Should have not altered alarms config with invalid values. 15');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6306);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_memory_temperature: 5}));
            fail('Should have not altered alarms config with invalid values. 16');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6307);
        }


        try {
            await _server.setAlarmsConfiguration(buildAlarmsConfig({max_gpu_memory_temperature: 656}));
            fail('Should have not altered alarms config with invalid values. 17');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(6307);
        }
    });
});










/**
 * Retrieves the alarms config stored in the db. If none is found, it will
 * return undefined.
 * @returns Promise<IAlarmsConfig|undefined>
 */
async function getAlarmsSnapshot(): Promise<IAlarmsConfig|undefined> {
    const {rows}: IQueryResult = await _db.query({
        text: `
            SELECT max_file_system_usage, max_memory_usage, max_cpu_load, max_cpu_temperature, max_gpu_load, max_gpu_temperature, max_gpu_memory_temperature
            FROM ${_server.getAlarmsTable()}
            WHERE id=1
        `,
        values: []
    });
    return rows[0];
}






/**
 * Given a partial configuration, it will fill whatever values are not 
 * provided with defaults.
 * @param config?
 * @returns IAlarmsConfig
 */
function buildAlarmsConfig(config?: {
    max_file_system_usage?: number,
    max_memory_usage?: number,
    max_cpu_load?: number,
    max_cpu_temperature?: number,
    max_gpu_load?: number,
    max_gpu_temperature?: number,
    max_gpu_memory_temperature?: number,
}): IAlarmsConfig {
    config = config || {};
    return {
        max_file_system_usage: config.max_file_system_usage || defaults.alarms.max_file_system_usage,
        max_memory_usage: config.max_memory_usage || defaults.alarms.max_memory_usage,
        max_cpu_load: config.max_cpu_load || defaults.alarms.max_cpu_load,
        max_cpu_temperature: config.max_cpu_temperature || defaults.alarms.max_cpu_temperature,
        max_gpu_load: config.max_gpu_load || defaults.alarms.max_gpu_load,
        max_gpu_temperature: config.max_gpu_temperature || defaults.alarms.max_gpu_temperature,
        max_gpu_memory_temperature: config.max_gpu_memory_temperature || defaults.alarms.max_gpu_memory_temperature,
    }
}











/* Misc Helpers */


describe('Misc Helpers: ', function() {

    it('-Can convert bytes into gigabytes', function() {
        //@ts-ignore
        expect(_server.fromBytesToGigabytes(1e+9)).toBe(1)
        //@ts-ignore
        expect(_server.fromBytesToGigabytes(2.85e+9)).toBe(2.85)
        //@ts-ignore
        expect(_server.fromBytesToGigabytes(6.8513e+11)).toBe(685.13)
    });
});