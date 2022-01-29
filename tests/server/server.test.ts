// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Init Server
import { IAlarmsConfig, IServerData, IServerInfo, IServerResources, IServerService } from "../../src/modules/server";
import { defaults } from "../../src/modules/server/defaults";
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);


// Init Utils
import { IUtilitiesService } from "../../src/modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Database
import { IDatabaseService, IQueryResult } from "../../src/modules/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);






/* Server Data Init & Retrieving */
describe('Server Data Init & Retrieving: ', function() {
    // Initialize the server
    beforeAll(async () => { 
        _server.testMode = true;
        await _server.initialize()
    });

    // Disable the test mode
    afterAll(() => { _server.testMode = false });


    it('-Can retrieve the server info: ', async function() {
        const data: IServerInfo = _server.getServerInfo();
        expect(typeof data).toBe("object");
        expect(typeof data.system).toBe("object");
        expect(typeof data.baseboard).toBe("object");
        expect(typeof data.bios).toBe("object");
        expect(typeof data.os).toBe("object");
        expect(typeof data.softwareVersions).toBe("object");
        expect(typeof data.networkInterfaces).toBe("object");
        expect(typeof data.cpu).toBe("object");
    });


    it('-Can retrieve the server resources: ', async function() {
        const data: IServerResources = _server.getServerResources();
        expect(typeof data).toBe("object");
        expect(typeof data.uptime).toBe("number");
        expect(typeof data.lastResourceScan).toBe("number");
        expect(typeof data.alarms).toBe("object");
        expect(typeof data.fileSystems).toBe("object");
        expect(typeof data.memory).toBe("object");
        expect(typeof data.cpuTemperature).toBe("object");
        expect(typeof data.gpu).toBe("object");
        expect(typeof data.runningServices).toBe("object");
        expect(typeof data.cpuLoad).toBe("object");
    });


    it('-Can retrieve the server data: ', async function() {
        const data: IServerData = _server.getServerData();
        expect(typeof data).toBe("object");
        expect(typeof data.info).toBe("object");
        expect(typeof data.resources).toBe("object");
    });
});









/* Server Monitoring */
describe('Server Monitoring: ', function() {
    // Init the test mode and the server
    beforeAll(async () => { 
        _server.testMode = true;
        await _server.initialize();
    });

    // Disable the test mode
    afterAll(() => { _server.testMode = false });


    /* File Systems */
    it('-Can detect if the file system usage is acceptable: ', function() {
        // @ts-ignore
        _server.fileSystems = [{usedPercent: 1}];
        // @ts-ignore
        expect(_server.isFileSystemUsageAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.fileSystems = [{usedPercent: 50}, {usedPercent: 60}, {usedPercent: 30}];
        // @ts-ignore
        expect(_server.isFileSystemUsageAcceptable()).toBeTruthy();
    });



    it('-Can detect if the file system usage is unacceptable: ', function() {
        // @ts-ignore
        _server.fileSystems = [{usedPercent: 100}];
        // @ts-ignore
        expect(_server.isFileSystemUsageAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.fileSystems = [{usedPercent: 50}, {usedPercent: 98}, {usedPercent: 95}];
        // @ts-ignore
        expect(_server.isFileSystemUsageAcceptable()).toBeFalsy();
    });



    /* Memory */
    it('-Can detect if the memory usage is acceptable: ', function() {
        // @ts-ignore
        _server.memory = {usedPercent: 31};
        // @ts-ignore
        expect(_server.isMemoryUsageAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.memory = {usedPercent: 51};
        // @ts-ignore
        expect(_server.isMemoryUsageAcceptable()).toBeTruthy();
    });


    it('-Can detect if the memory usage is unacceptable: ', function() {
        // @ts-ignore
        _server.memory = {usedPercent: 91};
        // @ts-ignore
        expect(_server.isMemoryUsageAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.memory = {usedPercent: 103};
        // @ts-ignore
        expect(_server.isMemoryUsageAcceptable()).toBeFalsy();
    });



    /* CPU Load */
    it('-Can detect if the cpu load is acceptable: ', function() {
        // @ts-ignore
        _server.cpuLoad = {avgLoad: 26, currentLoad: 37};
        // @ts-ignore
        expect(_server.isCPULoadAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.cpuLoad = {avgLoad: 1, currentLoad: 50};
        // @ts-ignore
        expect(_server.isCPULoadAcceptable()).toBeTruthy();
    });


    it('-Can detect if the cpu load is unacceptable: ', function() {
        // @ts-ignore
        _server.cpuLoad = {avgLoad: 89, currentLoad: 37};
        // @ts-ignore
        expect(_server.isCPULoadAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuLoad = {avgLoad: 1, currentLoad: 91};
        // @ts-ignore
        expect(_server.isCPULoadAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuLoad = {avgLoad: 95, currentLoad: 91};
        // @ts-ignore
        expect(_server.isCPULoadAcceptable()).toBeFalsy();
    });



    /* CPU Temperature */
    it('-Can detect if the cpu temperature is acceptable: ', function() {
        // @ts-ignore
        _server.cpuTemperature = {main: 45, chipset: 45, cores: [45, 45], socket: [45, 45]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 0, cores: [51, 52], socket: []};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeTruthy();
    });


    it('-Can detect if the cpu temperature is unacceptable: ', function() {
        // @ts-ignore
        _server.cpuTemperature = {main: 95, chipset: 45, cores: [45, 45], socket: [45, 45]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 95, cores: [51, 52], socket: []};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 50, cores: [95, 52], socket: []};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 56, cores: [41, 95], socket: [45, 45, 43]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 56, cores: [41, 46], socket: [99, 45, 43]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 50, chipset: 56, cores: [41, 46], socket: [43, 45, 95]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.cpuTemperature = {main: 95, chipset: 95, cores: [95, 95], socket: [95, 95, 95]};
        // @ts-ignore
        expect(_server.isCPUTemperatureAcceptable()).toBeFalsy();
    });




    /* GPU Load */
    it('-Can detect if the GPU Load is acceptable: ', function() {
        // @ts-ignore
        _server.gpu = {utilizationGpu: 65};
        // @ts-ignore
        expect(_server.isGPULoadAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.gpu = {utilizationGpu: 1};
        // @ts-ignore
        expect(_server.isGPULoadAcceptable()).toBeTruthy();
    });


    it('-Can detect if the GPU Load is unacceptable: ', function() {
        // @ts-ignore
        _server.gpu = {utilizationGpu: 99};
        // @ts-ignore
        expect(_server.isGPULoadAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.gpu = {utilizationGpu: 545};
        // @ts-ignore
        expect(_server.isGPULoadAcceptable()).toBeFalsy();
    });



    /* GPU Temperature */
    it('-Can detect if the GPU Temperature is acceptable: ', function() {
        // @ts-ignore
        _server.gpu = {temperatureGpu: 65};
        // @ts-ignore
        expect(_server.isGPUTemperatureAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.gpu = {temperatureGpu: 1};
        // @ts-ignore
        expect(_server.isGPUTemperatureAcceptable()).toBeTruthy();
    });



    it('-Can detect if the GPU Temperature is unacceptable: ', function() {
        // @ts-ignore
        _server.gpu = {temperatureGpu: 95};
        // @ts-ignore
        expect(_server.isGPUTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.gpu = {temperatureGpu: 266};
        // @ts-ignore
        expect(_server.isGPUTemperatureAcceptable()).toBeFalsy();
    });




    /* GPU Memory Temperature */
    it('-Can detect if the GPU Memory Temperature is acceptable: ', function() {
        // @ts-ignore
        _server.gpu = {temperatureMemory: 55};
        // @ts-ignore
        expect(_server.isGPUMemoryTemperatureAcceptable()).toBeTruthy();

        // @ts-ignore
        _server.gpu = {temperatureMemory: 1};
        // @ts-ignore
        expect(_server.isGPUMemoryTemperatureAcceptable()).toBeTruthy();
    });


    it('-Can detect if the GPU Memory Temperature is unacceptable: ', function() {
        // @ts-ignore
        _server.gpu = {temperatureMemory: 94};
        // @ts-ignore
        expect(_server.isGPUMemoryTemperatureAcceptable()).toBeFalsy();

        // @ts-ignore
        _server.gpu = {temperatureMemory: 185};
        // @ts-ignore
        expect(_server.isGPUMemoryTemperatureAcceptable()).toBeFalsy();
    });
});














/* Alarms Management */
describe('Server Alarms Management:', async function() {
    // Init test mode
    beforeAll(() => { _server.testMode = true });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { 
        // @ts-ignore
        await _db.query({text: `DELETE FROM ${_server.getAlarmsTable()};`}) 
    });
    afterAll(async () => { 
        // Clean the DB
         // @ts-ignore
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
    // @ts-ignore
    const table: string = _server.getAlarmsTable();
    const {rows}: IQueryResult = await _db.query({
        text: `
            SELECT max_file_system_usage, max_memory_usage, max_cpu_load, max_cpu_temperature, max_gpu_load, max_gpu_temperature, max_gpu_memory_temperature
            FROM ${table}
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



