import { IRawTable } from "./interfaces";

/* Tables */
export const TABLES: IRawTable[] = [
    // Server Alarms
    {
        name: 'server_alarms',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id                  SMALLINT NOT NULL PRIMARY KEY,
                maxFileSystemUsage  SMALLINT NOT NULL,
                maxMemoryUsage      SMALLINT NOT NULL,
                maxCPULoad          SMALLINT NOT NULL,
                maxCPUTemperature   SMALLINT NOT NULL,
                maxGPUTemperature   SMALLINT NOT NULL,
            );`
        }
    },

    // Candlesticks
    {
        name: 'candlesticks',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                ot  BIGINT NOT NULL PRIMARY KEY,
                ct  BIGINT NOT NULL,
                o   NUMERIC(20,2) NOT NULL,
                h   NUMERIC(20,2) NOT NULL,
                l   NUMERIC(20,2) NOT NULL,
                c   NUMERIC(20,2) NOT NULL,
                v   NUMERIC(20,2) NOT NULL,
                tbv NUMERIC(20,2) NOT NULL,
                nt  BIGINT NOT NULL
            );`
        }
    },

    // Forecast Candlesticks
    {
        name: 'forecast_candlesticks',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                ot  BIGINT NOT NULL PRIMARY KEY,
                ct  BIGINT NOT NULL,
                o   NUMERIC(20,2) NOT NULL,
                h   NUMERIC(20,2) NOT NULL,
                l   NUMERIC(20,2) NOT NULL,
                c   NUMERIC(20,2) NOT NULL,
                v   NUMERIC(20,2) NOT NULL,
                tbv NUMERIC(20,2) NOT NULL,
                nt  BIGINT NOT NULL
            );`
        }
    },

    
];