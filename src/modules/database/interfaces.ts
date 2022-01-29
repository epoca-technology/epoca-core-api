import {Pool, PoolConfig, QueryConfig, QueryResult, PoolClient, Client} from "pg";

// Postgres Types
export type IPool = Pool;
export type IPoolConfig = PoolConfig;
export type IPoolClient = PoolClient;
export type IQueryConfig = QueryConfig;
export type IQueryResult = QueryResult;
export type IClient = Client;


// Main Service
export interface IDatabaseService {
    // Properties
    config: IPoolConfig,
    pool: IPool,
    tables: ITable[],
    
    // Query
    query(config: IQueryConfig): Promise<IQueryResult>,

    // Initialization
    initialize(): Promise<void>,

    // Summary
    getDatabaseSummary(): Promise<IDatabaseSummary>,

    // Misc Helpers
    getTestTableName(tableName: string): string,
}



// Backup Service
export interface IDatabaseBackupService {

}





// Restore Service
export interface IDatabaseRestoreService {
    
}




// Validations
export interface IDatabaseValidations {
    
}




// Table
export interface ITable {name: string, sql: string};
export interface IRawTable {name: string, sql: Function};



// Summary
export interface IDatabaseSummary {
    name: string,
    version: string,
    size: string,
    port: number,
    tables: IDatabaseSummaryTable[]
}
export interface IDatabaseSummaryTable {
    name: string,
    size: string
}