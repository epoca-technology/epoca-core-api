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
            const results: any = await initializeDatabase();
            console.log(results);
            break;
        default:
            throw new Error(`The provided action ${data.action} is invalid.`);
    }
});








/**
 * Creates the Database as well as the required tables for the project to run.
 * @returns Promise<any[]>
 */
async function initializeDatabase(): Promise<any[]> {
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

    // Return the results
    return results;
}

