import { IRawTable } from "./interfaces";

/* Tables */
export const TABLES: IRawTable[] = [
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