import {Pool, PoolConfig, QueryConfig, QueryResult, PoolClient, Client} from "pg";
import { Reference, DataSnapshot } from "firebase-admin/database";


// Postgres Types
export type IPool = Pool;
export type IPoolConfig = PoolConfig;
export type IPoolClient = PoolClient;
export type IQueryConfig = QueryConfig;
export type IQueryResult = QueryResult;
export type IClient = Client;



// Firebase Types
export type IReference = Reference;
export type IDataSnapshot = DataSnapshot;




// Main Service
export interface IDatabaseService {
    // Properties
    config: IPoolConfig,
    pool: IPool,
    tn: ITableNames,
    apiSecretRef: IReference,
    
    // Query
    query(config: IQueryConfig): Promise<IQueryResult>,

    // Initialization
    initialize(): Promise<void>,

    // Summary
    getDatabaseSummary(): Promise<IDatabaseSummary>,
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

// Table Names
export interface ITableNames {
    gui_version: string,
    server_alarms: string,
    candlesticks: string,
    forecast_candlesticks: string,
    users: string,
}





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




// Firebase Fanout
export interface IFanoutObject {
    [refPath: string]: any
}