// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';

// Init Utilities
import { IDatabaseService } from "../../modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);





/**
 * CLI Initializer
 */
console.log('DATABASE');
console.log('@param action? // Defaults to 0')
console.log('0 = Initialize Database');
console.log('1 = Display Tables Size');
console.log(' ');
prompt.start();




/**
 * Database CLI
 */
prompt.get(['action'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Init the action
    const action: string = typeof data.action == "string" && data.action.length > 0 ? data.action: '0';

    // Handle the action accordingly
    switch(action) {
        case '0':
            await initializeDatabase();
            break;
        case '1':
            await displayTablesSize();
            break;
        default:
            throw new Error(`The provided action ${data.action} is invalid.`);
    }
});








/**
 * Creates the Database as well as the required tables for the project to run.
 * @returns Promise<any[]>
 */
async function initializeDatabase(): Promise<void> {
    // Init the results
    let results: any[] = [];

    // Create the DB if it doesn't exist

    // Build a custom config object as the DB may not exist
    let dbCreationConfig = Object.assign({}, _db.connectionConfig);
    delete dbCreationConfig.database;

    // Attempt to create it
    const dbCreation: any = await _db.query({sql: `CREATE DATABASE IF NOT EXISTS ${_db.connectionConfig.database};`}, dbCreationConfig);
    results.push(dbCreation);

    // Create the required tables in case they don't exist
    for (let table of _db.tables) {
        const tableCreation: any = await _db.query({sql: table});
        results.push(tableCreation);
    }

    // Display the results
    console.log(results);
}







/**
 * Displays the size of all existing tables in the database
 * @returns Promise<void>
 */
async function displayTablesSize(): Promise<void> {
    // Retrieve the sizes and display them
    const tableSizes: any = await _db.query({sql: `
        SELECT 
        table_schema as 'Database', 
        table_name AS 'Table', 
        round(((data_length + index_length) / 1024 / 1024), 2) 'Size in MB' 
        FROM information_schema.TABLES 
        WHERE TABLE_SCHEMA = '${_db.connectionConfig.database}'
        ORDER BY (data_length + index_length) DESC;
    `});
    console.table(tableSizes);
}