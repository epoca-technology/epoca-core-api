import * as mysql from "mysql";



// Service
export interface IDatabaseService {
    // Properties
    connectionConfig: mysql.ConnectionConfig,
    tables: string[],
    backupDirectory: string,

    
    // Query
    query(sql: mysql.QueryOptions, config?: mysql.ConnectionConfig): Promise<any>
}


