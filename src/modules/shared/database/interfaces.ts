import {Pool, PoolConfig, QueryConfig, QueryResult, PoolClient, Client} from "pg";

// Postgres Types
export type IPool = Pool;
export type IPoolConfig = PoolConfig;
export type IPoolClient = PoolClient;
export type IQueryConfig = QueryConfig;
export type IQueryResult = QueryResult;
export type IClient = Client;


// Service
export interface IDatabaseService {
    // Properties
    config: IPoolConfig,
    pool: IPool,
    tables: ITable[],

    
    // Query
    query(config: IQueryConfig): Promise<IQueryResult>
}



// Table
export interface ITable {name: string, sql: string};