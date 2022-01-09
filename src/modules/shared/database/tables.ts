import { ITable } from "./interfaces";

/* Tables */
export const TABLES: ITable[] = [
    {
        name: 'test_candlesticks',
        sql: 
        `CREATE TABLE IF NOT EXISTS test_candlesticks (
            ot  BIGINT NOT NULL PRIMARY KEY,
            ct  BIGINT NOT NULL,
            o   NUMERIC(20,2) NOT NULL,
            h   NUMERIC(20,2) NOT NULL,
            l   NUMERIC(20,2) NOT NULL,
            c   NUMERIC(20,2) NOT NULL,
            v   NUMERIC(20,2) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS test_ct_index ON test_candlesticks(ct);`
    },
    {
        name: 'candlesticks',
        sql: 
        `CREATE TABLE IF NOT EXISTS candlesticks (
            ot  BIGINT NOT NULL PRIMARY KEY,
            ct  BIGINT NOT NULL,
            o   NUMERIC(20,2) NOT NULL,
            h   NUMERIC(20,2) NOT NULL,
            l   NUMERIC(20,2) NOT NULL,
            c   NUMERIC(20,2) NOT NULL,
            v   NUMERIC(20,2) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS ct_index ON candlesticks(ct);`
    },
    {
        name: 'test_forecast_candlesticks',
        sql: 
        `CREATE TABLE IF NOT EXISTS test_forecast_candlesticks (
            ot  BIGINT NOT NULL PRIMARY KEY,
            ct  BIGINT NOT NULL,
            o   NUMERIC(20,2) NOT NULL,
            h   NUMERIC(20,2) NOT NULL,
            l   NUMERIC(20,2) NOT NULL,
            c   NUMERIC(20,2) NOT NULL,
            v   NUMERIC(20,2) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS test_forecast_ct_index ON test_forecast_candlesticks(ct);`
    },
    {
        name: 'forecast_candlesticks',
        sql: 
        `CREATE TABLE IF NOT EXISTS forecast_candlesticks (
            ot  BIGINT NOT NULL PRIMARY KEY,
            ct  BIGINT NOT NULL,
            o   NUMERIC(20,2) NOT NULL,
            h   NUMERIC(20,2) NOT NULL,
            l   NUMERIC(20,2) NOT NULL,
            c   NUMERIC(20,2) NOT NULL,
            v   NUMERIC(20,2) NOT NULL
        );
        CREATE INDEX IF NOT EXISTS forecast_ct_index ON forecast_candlesticks(ct);`
    },
];