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
    deleteDatabase(): Promise<void>,

    // Summary
    getDatabaseSummary(): Promise<IDatabaseSummary>,
}





// File Service
export interface IDatabaseFileService {
    // Backup
    uploadDatabaseBackup(fileName: string): Promise<void>,

    // Restore
    restoreDatabaseBackup(fileName: string): Promise<void>,
    cleanDatabaseManagementFiles(): Promise<void>
}







// Table
export interface ITable {name: string, sql: string};
export interface IRawTable {name: string, sql: Function};

// Table Names
export interface ITableNames {
    gui_version: string,
    server_alarms: string,
    candlesticks: string,
    prediction_candlesticks: string,
    users: string,
    ip_blacklist: string,
    api_errors: string
}





// Summary
export interface IDatabaseSummary {
    name: string,
    version: string,
    size: number,
    port: number,
    tables: IDatabaseSummaryTable[]
}
export interface IDatabaseSummaryTable {
    name: string,
    size: number
}




// Firebase Fanout
export interface IFanoutObject {
    [refPath: string]: any
}