import {injectable} from "inversify";
import { 
    IDatabaseService,
} from "./interfaces";
import { TABLES } from "./tables";
import * as mysql from "mysql";



@injectable()
export class DatabaseService implements IDatabaseService {
    // Inject dependencies



    // Connection Configuration
    public connectionConfig: mysql.ConnectionConfig = {
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'plutus'
    }


    // Tables
    public readonly tables: string[] = TABLES;





    
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
                connection.end();

                // Handle the error if any
                if (err) reject(err);

                // Resolve the results
                resolve(result);
            });
        });
    }
}