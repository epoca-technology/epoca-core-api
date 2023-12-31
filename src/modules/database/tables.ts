import { IRawTable } from "./interfaces";

/* Tables */
export const TABLES: IRawTable[] = [
    /**
     * GUI Version
     * 
     */
    {
        name: "gui_version",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          SMALLINT NOT NULL PRIMARY KEY,
                version     VARCHAR(15) NOT NULL
            );`
        }
    },

    
    /**
     * Server Alarms
     * 
     */
    {
        name: "server_alarms",
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


    /**
     * Candlesticks
     * 
     */
    {
        name: "candlesticks",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                ot  BIGINT NOT NULL PRIMARY KEY,
                ct  BIGINT NOT NULL,
                o   NUMERIC(20,2) NOT NULL,
                h   NUMERIC(20,2) NOT NULL,
                l   NUMERIC(20,2) NOT NULL,
                c   NUMERIC(20,2) NOT NULL,
                v   NUMERIC(20,2) NOT NULL
            );`
        }
    },

    
    /**
     * Prediction Candlesticks
     * 
     */
    {
        name: "prediction_candlesticks",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                ot  BIGINT NOT NULL PRIMARY KEY,
                ct  BIGINT NOT NULL,
                o   NUMERIC(20,2) NOT NULL,
                h   NUMERIC(20,2) NOT NULL,
                l   NUMERIC(20,2) NOT NULL,
                c   NUMERIC(20,2) NOT NULL,
                v   NUMERIC(20,2) NOT NULL
            );`
        }
    },


    /**
     * Users
     * 
     */
    {
        name: "users",
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


    /**
     * IP Blacklist
     * 
     */
    {
        name: "ip_blacklist",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                ip  VARCHAR(300) NOT NULL PRIMARY KEY,
                n   VARCHAR(3000) NULL,
                c   BIGINT NOT NULL
            );`
        }
    },


    /**
     * API Errors
     * 
     */
    {
        name: "api_errors",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                o       VARCHAR(300) NOT NULL,
                e       VARCHAR(3000) NOT NULL,
                c       BIGINT NOT NULL,
                uid     uuid NULL,
                ip      VARCHAR(300) NULL,
                p       JSONB NULL
            );`
        }
    },

    
    /**
     * Window State Configuration
     * 
     */
    {
        name: "window_state_configuration",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                data            JSONB NOT NULL
            );`
        }
    },

    
    /**
     * Liquidity Configuration
     * 
     */
    {
        name: "liquidity_configuration",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                data            JSONB NOT NULL
            );`
        }
    },

    
    /**
     * KeyZones Configuration
     * 
     */
    {
        name: "keyzones_configuration",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                data            JSONB NOT NULL
            );`
        }
    },

    
    /**
     * KeyZones Events
     * 
     */
    {
        name: "keyzones_events",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                k        VARCHAR(10) NOT NULL,
                kz       JSONB NOT NULL,
                t        BIGINT NOT NULL,
                e        BIGINT NOT NULL,
                pl       NUMERIC(20,2) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_t ON ${tableName}(t);`
        }
    },

    
    /**
     * Coins Configuration
     * 
     */
    {
        name: "coins_configuration",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                data            JSONB NOT NULL
            );`
        }
    },

    
    /**
     * Coins
     * 
     */
    {
        name: "coins",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                data            JSONB NOT NULL
            );`
        }
    },



    
    /**
     * Reversal Configuration
     * 
     */
    {
        name: "reversal_configuration",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id        SMALLINT NOT NULL PRIMARY KEY,
                data      JSONB NOT NULL
            );`
        }
    },


    /**
     * Reversal States
     * 
     */
    {
        name: "reversal_states",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id       BIGINT NOT NULL PRIMARY KEY,
                data     JSONB NOT NULL
            );`
        }
    },


    /**
     * Reversal Coins States
     * 
     */
    {
        name: "reversal_coins_states",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id       BIGINT NOT NULL PRIMARY KEY,
                data     JSONB NOT NULL
            );`
        }
    },

    
    /**
     * Position Strategy
     * 
     */
    {
        name: "position_strategy",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                strategy        JSONB NOT NULL
            );`
        }
    },



    /**
     * Position Action Payloads
     * 
     */
    {
        name: "position_action_payloads",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                t           BIGINT NOT NULL,
                k           VARCHAR(50) NOT NULL,
                s           VARCHAR(20) NOT NULL,
                sd          VARCHAR(10) NOT NULL,
                p           JSONB NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_t ON ${tableName}(t);
            CREATE INDEX IF NOT EXISTS ${tableName}_k ON ${tableName}(k);`
        }
    },



    /**
     * Position Records
     * 
     */
    {
        name: "position_records",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          uuid NOT NULL PRIMARY KEY,
                data        JSONB NOT NULL
            );`
        }
    },



    /**
     * Position Headlines
     * 
     */
    {
        name: "position_headlines",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          uuid NOT NULL PRIMARY KEY,
                o           BIGINT NOT NULL,
                s           VARCHAR(20) NOT NULL,
                sd          VARCHAR(10) NOT NULL,
                iw          NUMERIC(20,2) NOT NULL,
                g           NUMERIC(4,2) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_o ON ${tableName}(o);`
        }
    },







    /**
     * Income Records
     * 
     */
    {
        name: "income_records",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          VARCHAR(100) NOT NULL,
                t           BIGINT NOT NULL,
                it          VARCHAR(100) NOT NULL,
                v           NUMERIC(20,2) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_t ON ${tableName}(t);
            CREATE INDEX IF NOT EXISTS ${tableName}_it ON ${tableName}(it);`
        }
    },
];