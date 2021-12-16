import {inject, injectable} from "inversify";
import { 
    IDatabaseService,
    IConnection,
    IConnectionConfig
} from "./interfaces";
import { SYMBOLS } from "../../../ioc";
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
        // TEST: 1m_candlesticks
        `CREATE TABLE IF NOT EXISTS test_1m_candlesticks (
            ot BIGINT(20) NOT NULL,
            ct BIGINT(20) NOT NULL,
            o VARCHAR(100) NOT NULL,
            h VARCHAR(100) NOT NULL,
            l VARCHAR(100) NOT NULL,
            c VARCHAR(100) NOT NULL,
            v VARCHAR(100) NOT NULL,
            tbv VARCHAR(100) NOT NULL,
            s VARCHAR(5) NOT NULL,
            PRIMARY KEY (ot)
        );`,

        // 1m_candlesticks
        `CREATE TABLE IF NOT EXISTS 1m_candlesticks (
            ot BIGINT(20) NOT NULL,
            ct BIGINT(20) NOT NULL,
            o VARCHAR(100) NOT NULL,
            h VARCHAR(100) NOT NULL,
            l VARCHAR(100) NOT NULL,
            c VARCHAR(100) NOT NULL,
            v VARCHAR(100) NOT NULL,
            tbv VARCHAR(100) NOT NULL,
            s VARCHAR(5) NOT NULL,
            PRIMARY KEY (ot)
        );`,
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