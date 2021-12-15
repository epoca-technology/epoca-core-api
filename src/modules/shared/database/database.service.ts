import {inject, injectable, postConstruct} from "inversify";
import { 
    IDatabaseService,
    IConnection,
    IConnectionConfig
} from "./interfaces";
import { SYMBOLS } from "../../../types";
import * as mysql from "mysql";


@injectable()
export class DatabaseService implements IDatabaseService {
    // Inject dependencies



    // Connection Configuration
    public connectionConfig: IConnectionConfig = {
        host: 'localhost',
        user: 'root',
        password: '123456',
        database: 'plutus'
    }


    // Tables
    public readonly tables: string[] = [
        // 1m_candlesticks
        `
            CREATE TABLE IF NOT EXISTS 1m_candlesticks (
                s VARCHAR(20) NOT NULL,
                ot VARCHAR(20) NOT NULL,
                ct VARCHAR(20) NOT NULL,
                o VARCHAR(20) NOT NULL,
                h VARCHAR(20) NOT NULL,
                l VARCHAR(20) NOT NULL,
                c VARCHAR(20) NOT NULL,
                v VARCHAR(20) NOT NULL,
                tbv VARCHAR(20) NOT NULL
            );
        `,
    ];





    
    constructor() { }












    /* Query */






    /**
     * Performs a SQL query and retrieves the results.
     * @param sql 
     * @param config? 
     * @returns Promise<any>
     */
    public query(sql: string, config?: mysql.ConnectionConfig): Promise<any> {
        // Init the connection
        const connection: mysql.Connection = mysql.createConnection(config || this.connectionConfig);

        // Perform the query
        return new Promise((resolve, reject) => {
            connection.query(sql, (err: mysql.MysqlError, result: any) => {
                // Handle the error if any
                if (err) {
                    connection.destroy();
                    reject(err);
                };

                // Destroy the connection and resolve the results
                connection.destroy();
                resolve(result);
            });
        });
    }














}