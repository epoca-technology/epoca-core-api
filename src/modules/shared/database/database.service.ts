import {injectable} from "inversify";
import { 
    IDatabaseService, 
    ITable, 
    IPool, 
    IPoolClient, 
    IPoolConfig, 
    IQueryResult, 
    IQueryConfig,
    IDatabaseSummary,
    IDatabaseSummaryTable,
} from "./interfaces";
import { TABLES } from "./tables";
import {Client, Pool, types} from "pg";


@injectable()
export class DatabaseService implements IDatabaseService {
    // Inject dependencies


    
    // Pool Config
    public readonly config: IPoolConfig = {
        host: 'localhost',
        user: 'postgres',
        password: '123456',
        database: 'plutus',
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        port: 5432
    }


    // Pool
    public readonly pool: IPool = new Pool(this.config);


    // Database Tables
    public readonly tables: ITable[] = this.buildDatabaseTables();



    
    constructor() {
        // Bigint Parsing
        types.setTypeParser(20, (val) => { return parseInt(val, 10) })

        // Numeric Parsing
        types.setTypeParser(1700, (val) => { return parseFloat(val) });
    }








    /* Query */




    /**
     * Given a Query config, it will execute it on the database and retrieve
     * the results.
     * @param config 
     * @returns Promise<IQueryResult>
     */
    public async query(config: IQueryConfig): Promise<IQueryResult> {
        // Init the client
        const client: IPoolClient = await this.pool.connect();

        try {
            // Execute the query
            const query: IQueryResult = await client.query(config);

            // Return the results
            return query;
        }
        finally { client.release() }
    }








    






    /* Initialization */






    /**
     * Creates the Database as well as the required tables for the project to run.
     * @returns Promise<any[]>
     */
    public async initialize(): Promise<void> {
        // Create the DB
        await this.createDatabase();

        // Init the client
        const client: IPoolClient = await this.pool.connect();

        // Create the required tables in case they don't exist
        try { for (let table of this.tables) { await client.query(table.sql) } }
        finally { client.release() }
    }







    /**
     * Checks for the existance of the database. If it doesn't exist, it will create it.
     * @returns Promise<void>
     */
    private async createDatabase(): Promise<void> {
        // Init a client
        const client: Client = new Client({
            host: this.config.host,
            user: this.config.user,
            password: this.config.password,
            port: this.config.port,
        });

        // Perform the connection
        await client.connect();
    
        try {
            // Check if the DB exists and create it if it doesn't
            const {rowCount}: IQueryResult = await client.query('SELECT FROM pg_database WHERE datname = $1', [this.config.database]);
            if (rowCount == 0) {
                await client.query(`CREATE DATABASE ${this.config.database}`);
            }
        }
        finally { await client.end() }
    }









    /**
     * Iterates over the raw tables and processes them. Also adds the testing
     * tables with the test_ prefix.
     * @returns ITable[]
     */
     private buildDatabaseTables(): ITable[] {
        // Initialize the list of processed tables
        let tables: ITable[] = [];

        // Iterate over the raw tables
        let testTableName: string;
        TABLES.forEach((t) => { 
            // Append the real table
            tables.push({name: t.name, sql: t.sql(t.name)});

            // Append the test table
            testTableName = this.getTestTableName(t.name);
            tables.push({name: testTableName, sql: t.sql(testTableName)});
        });

        // Return the processed list
        return tables;
    }









    /* Summary */






    /**
     * Builds the Database Summary Data and returns it.
     * @returns Promise<IDatabaseSummary>
     */
    public async getDatabaseSummary(): Promise<IDatabaseSummary> {
        // Init the client
        const client: IPoolClient = await this.pool.connect();

        try {
            // Retrieve the version of the database
            const version: IQueryResult = await client.query(`SELECT version();`);

            // Retrieve the size of the entire database
            const dbSize: IQueryResult = await client.query(`SELECT pg_size_pretty( pg_database_size('${this.config.database}') );`);

            // Retrieve the size for each table
            let tables: IDatabaseSummaryTable[] = []
            for (let table of this.tables) {
                const tableSize: IQueryResult = await client.query(`SELECT pg_size_pretty( pg_total_relation_size('${table.name}') );`);
                tables.push({
                    name: table.name,
                    size: tableSize.rows[0].pg_size_pretty
                });
            }

            // Return the Summary
            return {
                name: this.config.database,
                version: version.rows[0].version,
                size: dbSize.rows[0].pg_size_pretty,
                tables: tables
            }
        }
        finally { client.release() }
    }
















    /* Misc Helpers */





    /**
     * Given a table name, it will add the test prefix to the name.
     * @param tableName 
     * @returns string
     */
    public getTestTableName(tableName: string): string { return `test_${tableName}` }





}