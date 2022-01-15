import { ITable } from "./interfaces";

/* Tables */
export const TABLES: ITable[] = [
    // Candlesticks
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
        );`
    },
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
        );`
    },

    // Forecast Candlesticks
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
        );`
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
        );`
    },
];