// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';
import {Client} from "pg";
import {execute} from "@getvim/execute";

// Init Database
import { IDatabaseService, IPoolClient, IQueryResult } from "../../modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);



/**
 * CLI Initializer
 */
console.log('DATABASE UTILITIES');
console.log('@param action? // Defaults to init')
console.log('init = Initialize Database');
console.log('size = Display Database Size');
console.log('backup = Backup Database');
console.log('restore = Restore Database');
console.log(' ');
prompt.start();




/**
 * Database CLI
 */
prompt.get(['action'], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    // Handle the action accordingly
    switch(data.action) {
        case 'init':
            await initializeDatabase();
            break;
        case 'size':
            await displayDatabaseSize();
            break;
        case 'backup':
            await backupDatabase();
            break;
        case 'restore':
            await restoreDatabase();
            break;
        default:
            throw new Error(`The provided action ${data.action} is invalid.`);
    }
});







/* Initialize Database */




/**
 * Creates the Database as well as the required tables for the project to run.
 * @returns Promise<any[]>
 */
async function initializeDatabase(): Promise<void> {
    console.log(' ');console.log('DATABASE INITIALIZATION');

    // Create the DB
    await createDatabase();

    // Init the client
    const client: IPoolClient = await _db.pool.connect();

    try {
        // Create the required tables in case they don't exist
        for (let table of _db.tables) {
            const tableCreation: IQueryResult = await client.query(table.sql);
            console.log(' ');console.log(`Table ${table.name} created successfuly:`, tableCreation);
        }
    }
    finally { client.release() }
}





/**
 * Checks for the existance of the database. If it doesn't, it will create it.
 * @returns Promise<void>
 */
async function createDatabase(): Promise<void> {
    // Retrieve a client
    const client: Client = new Client({
        host: _db.config.host,
        user: _db.config.user,
        password: _db.config.password,
        port: _db.config.port,
    });

    // Perform the connection
    await client.connect();

    try {
        // Check if the DB exists and create it if it doesn't
        const {rowCount}: IQueryResult = await client.query('SELECT FROM pg_database WHERE datname = $1', [_db.config.database]);
        let dbCreationResult: IQueryResult|undefined;
        if (rowCount == 0) {
            dbCreationResult = await client.query(`CREATE DATABASE ${_db.config.database}`);
            console.log(' ');console.log(`Database ${_db.config.database} was created successfuly:`, dbCreationResult);
        } else {
            console.log(' ');console.log(`The DB ${_db.config.database} already exists. Skipping creation.`);
        }
    }
    finally { await client.end() }
}













/* Database Size */


/**
 * Displays the size of all existing tables in the database
 * @returns Promise<void>
 */
 async function displayDatabaseSize(): Promise<void> {
    console.log(' ');console.log('DATABASE SIZE');

    // Init the client
    const client: IPoolClient = await _db.pool.connect();

    try {
        // Retrieve the size of the entire database
        const dbSize: IQueryResult = await client.query(`SELECT pg_size_pretty( pg_database_size('${_db.config.database}') );`);
        console.log(' ');console.log(`Database: ${dbSize.rows[0].pg_size_pretty}`);console.log(' ');

        // Retrieve the size for each table
        for (let table of _db.tables) {
            const tableSize: IQueryResult = await client.query(`SELECT pg_size_pretty( pg_total_relation_size('${table.name}') );`);
            console.log(`${table.name}: ${tableSize.rows[0].pg_size_pretty}`);
        }
    }
    finally { client.release() }
}








/* Backup */



/**
 * Creates and compresses a dump file that is placed inside of the ./db_backups 
 * directory.
 * @returns Promise<void>
 */
 async function backupDatabase(): Promise<void> {
     try {
        console.log(' ');console.log('DATABASE BACKUP');console.log(' ');
        await execute(`PGPASSWORD="${_db.config.password}" pg_dump -U ${_db.config.user} -h ${_db.config.host} -d ${_db.config.database} -f ./db_backups/backup.dump -Fc`);
     } catch (e) {
        console.log(e);
     }
}








/* Restore */


/**
 * Restores the backup file located in the db_backup directory.
 * @returns Promise<void>
 */
async function restoreDatabase(): Promise<void> {
    try {
        console.log(' ');console.log('DATABASE RESTORE');console.log(' ');
        await initializeDatabase();
        await execute(`PGPASSWORD="${_db.config.password}" pg_restore --clean -U ${_db.config.user} -h ${_db.config.host} -d plutus ./db_backups/backup.dump`);
    } catch (e) {
       console.log(e);
    }
}