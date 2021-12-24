import {injectable} from "inversify";
import { IDatabaseService, ITable} from "./interfaces";
import { TABLES } from "./tables";
import * as mysql from "mysql";
import {Pool, PoolConfig} from "pg";


@injectable()
export class DatabaseService implements IDatabaseService {
    // Inject dependencies


    
    // Pool Config
    public readonly config: PoolConfig = {
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
    public readonly pool: Pool = new Pool(this.config);





    /* MySQL */

    // Connection Configuration
    public connectionConfig: mysql.ConnectionConfig = {
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'plutus'
    }


    // Tables
    public readonly tables: ITable[] = TABLES;


    // Backups Directory
    public readonly backupDirectory: string = './db_backups';



    
    constructor() { }












    /* Query */






    /**
     * Performs a SQL query and retrieves the results.
     * @param sql 
     * @param config? 
     * @returns Promise<any>
     */
    public query(sql: mysql.QueryOptions, config?: mysql.ConnectionConfig): Promise<any> {
        // Init the connection
        const connection: mysql.Connection = mysql.createConnection(config || this.connectionConfig);

        // Perform the query
        return new Promise((resolve, reject) => {
            connection.query(sql, (err: mysql.MysqlError, result: any) => {
                // End the connection
                connection.destroy();

                // Handle the error if any
                if (err) reject(err);

                // Resolve the results
                resolve(result);
            });
        });
    }
}