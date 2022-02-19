import { IRawTable } from "./interfaces";

/* Tables */
export const TABLES: IRawTable[] = [
    // GUI Version
    {
        name: 'gui_version',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          SMALLINT NOT NULL PRIMARY KEY,
                version     VARCHAR(15) NOT NULL
            );`
        }
    },

    // Server Alarms
    {
        name: 'server_alarms',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id                              SMALLINT NOT NULL PRIMARY KEY,
                max_file_system_usage           SMALLINT NOT NULL,
                max_memory_usage                SMALLINT NOT NULL,
                max_cpu_load                    SMALLINT NOT NULL,
                max_cpu_temperature             SMALLINT NOT NULL,
                max_gpu_load                    SMALLINT NOT NULL,
                max_gpu_temperature             SMALLINT NOT NULL,
                max_gpu_memory_temperature      SMALLINT NOT NULL
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

    // Users
    {
        name: 'users',
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                uid         uuid NOT NULL PRIMARY KEY,
                email       VARCHAR(150) NOT NULL UNIQUE,
                otp_secret  VARCHAR(60) NOT NULL,
                authority   SMALLINT NOT NULL,
                fcm_token   VARCHAR(300) NULL,
                creation    BIGINT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_email ON ${tableName}(email);`
        }
    },
];