import * as mysql from "mysql";
import {Pool, PoolConfig} from "pg";


// Service
export interface IDatabaseService {
    // Properties
    config: PoolConfig,
    pool: Pool,
    connectionConfig: mysql.ConnectionConfig,
    tables: ITable[],
    backupDirectory: string,

    
    // Query
    query(sql: mysql.QueryOptions, config?: mysql.ConnectionConfig): Promise<any>
}



// Table
export interface ITable {name: string, sql: string};