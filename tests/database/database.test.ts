// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';


// Init the Database Service
import { IDatabaseService, IDatabaseSummary, ITableNames } from "../../src/modules/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);


// Tables
import { TABLES } from "../../src/modules/database/tables";


// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');



/* Init */
describe('Database Init: ',  function() {
    it('-Can process raw tables and build a list of tables ready to be created: ', function() {
        //@ts-ignore
        expect(_db.buildDatabaseTables().length).toBe(TABLES.length*2);
    });

    
    it('-Can build the correct table names with the testMode disabled: ', function() {
        //@ts-ignore
        const tn: ITableNames = _db.buildTableNames(false);
        expect(tn.server_alarms).toBe('server_alarms');
        expect(tn.gui_version).toBe('gui_version');
        expect(tn.candlesticks).toBe('candlesticks');
        expect(tn.forecast_candlesticks).toBe('forecast_candlesticks');
    }); 
    
    it('-Can build the correct table names with the testMode enabled: ', function() {
        //@ts-ignore
        const tn: ITableNames = _db.buildTableNames(true);
        expect(tn.server_alarms).toBe('test_server_alarms');
        expect(tn.gui_version).toBe('test_gui_version');
        expect(tn.candlesticks).toBe('test_candlesticks');
        expect(tn.forecast_candlesticks).toBe('test_forecast_candlesticks');
    }); 
});





/* Summary */
describe('Database Summary: ',  async function() {
    it('-Can build a valid summary of the database: ', async function() {
        // Build the summary
        const summary: IDatabaseSummary = await _db.getDatabaseSummary();
        
        // Validate each property
        expect(typeof summary.name).toBe("string");
        expect(typeof summary.version).toBe("string");
        expect(typeof summary.size).toBe("number");
        expect(typeof summary.port).toBe("number");
        expect(typeof summary.tables).toBe("object");

        // Make sure the number of tables is correct
        //@ts-ignore
        expect(summary.tables.length).toBe(_db.tables.length);
    });

    
});








/* Misc Helpers */
describe('Database Misc Helpers: ',  function() {
    it('-Can retrieve test table names: ', function() {
        // @ts-ignore
        expect(_db.getTestTableName('some_cool_table')).toBe('test_some_cool_table');
        // @ts-ignore
        expect(_db.getTestTableName('test_some_cool_table')).toBe('test_test_some_cool_table');
    });


});






