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
            v   NUMERIC(20,2) NOT NULL,
            tbv NUMERIC(20,2) NOT NULL
        );`
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
            v   NUMERIC(20,2) NOT NULL,
            tbv NUMERIC(20,2) NOT NULL
        );`
    },
];




// MYSQL - DEPRECATE
export const _TABLES: string[] = [
    // TEST: 1m_candlesticks
    `CREATE TABLE IF NOT EXISTS test_1m_candlesticks (
        ot BIGINT(20) NOT NULL,
        ct BIGINT(20) NOT NULL,
        o VARCHAR(100) NOT NULL,
        h VARCHAR(100) NOT NULL,
        l VARCHAR(100) NOT NULL,
        c VARCHAR(100) NOT NULL,
        v VARCHAR(100) NOT NULL,
        tbv VARCHAR(100) NOT NULL,
        s VARCHAR(5) NOT NULL,
        PRIMARY KEY (ot)
    );`,

    // 1m_candlesticks
    `CREATE TABLE IF NOT EXISTS 1m_candlesticks (
        ot BIGINT(20) NOT NULL,
        ct BIGINT(20) NOT NULL,
        o VARCHAR(100) NOT NULL,
        h VARCHAR(100) NOT NULL,
        l VARCHAR(100) NOT NULL,
        c VARCHAR(100) NOT NULL,
        v VARCHAR(100) NOT NULL,
        tbv VARCHAR(100) NOT NULL,
        s VARCHAR(5) NOT NULL,
        PRIMARY KEY (ot)
    );`,
]