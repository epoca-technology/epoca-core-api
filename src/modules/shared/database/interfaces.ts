import * as mysql from "mysql";


// General Types
export type IConnectionConfig = mysql.ConnectionConfig;
export type IConnection = mysql.Connection;



// Service
export interface IDatabaseService {
    // Properties
    connectionConfig: IConnectionConfig,
    tables: string[],

    // Query
    query(sql: string, config?: IConnectionConfig): Promise<any>,
}


