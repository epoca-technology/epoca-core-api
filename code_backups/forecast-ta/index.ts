// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';
import mysqldump from 'mysqldump';
import {Pool, PoolConfig, PoolClient, Client, QueryResult} from "pg";


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
console.log('2 = Backup Database');
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
            //await displayTablesSize();
            break;
        case '2':
            //await backupDatabase();
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
    // Create the DB
    await createDatabase();

    // Init the client
    const client: PoolClient = await _db.pool.connect();

    try {
        // Create the required tables in case they don't exist
        for (let table of _db.tables) {
            const tableCreation: QueryResult = await client.query(table.sql);
            console.log(tableCreation);
        }
    } finally { client.release() }
}
/*async function initializeDatabase(): Promise<void> {
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
}*/





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
        const {rowCount}: QueryResult = await client.query('SELECT FROM pg_database WHERE datname = $1', [_db.config.database]);
        let dbCreationResult: QueryResult|undefined;
        if (rowCount == 0) {
            dbCreationResult = await client.query(`CREATE DATABASE ${_db.config.database}`);
            console.log(`Database ${_db.config.database} was created successfuly.`, dbCreationResult);
        } else {
            console.log(`The DB ${_db.config.database} already exists. Skipping creation.`);
        }
    }
    finally { await client.end() }
}







/**
 * It will retrieve the last decompressed dump made.
 * @returns Promise<string>
 */
/*async function getDatabaseDump(): Promise<string> {
    // Retrieve the last backup made
    const file: Buffer = fs.readFileSync(`${_db.backupDirectory}/${getLastBackupName()}`);

    // Decompress the file
    const decompressed: Buffer = await ungzip(file);
    console.log(decompressed.length);

    // Return the decompressed file in string format
    return decompressed.toString();
}*/







/**
 * It will read the backup directory and retrieve the last performed 
 * backup name.
 * @returns string
 */
/*function getLastBackupName(): string {
    // Read the backup directory's contents
    const files: string[] = fs.readdirSync(_db.backupDirectory);

    // Iterate over the files and create a list out of the names
    let names: string[] = [];
    files.forEach((f) => names.push(f.split('.')[0]));

    // Make sure that files were found
    if (names.length > 0) {
        // Return the file with the highest timestamp
        return `${BigNumber.max.apply(null, names)}.sql.gz`;
    } else {
        throw new Error(`No database backup files were found in ${_db.backupDirectory}`);
    }
}*/











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










/**
 * Creates and compresses a dump file that is placed inside of the ./db_backups 
 * directory.
 * @returns Promise<void>
 */
async function backupDatabase(): Promise<void> {
    // Backup the DB
    const dump: any = await mysqldump({
        connection: <mysqldump.ConnectionOptions>_db.connectionConfig,
        dumpToFile: `${_db.backupDirectory}/${Date.now()}.sql.gz`,
        compressFile: true,
    });
    console.log(dump);
}