import {injectable} from "inversify";
import { IDatabaseService, ITable, IPool, IPoolClient, IPoolConfig, IQueryResult, IQueryConfig} from "./interfaces";
import { TABLES } from "./tables";
import {Pool, types} from "pg";


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
    public readonly tables: ITable[] = TABLES;



    
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
}