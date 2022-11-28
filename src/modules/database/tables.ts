import { IRawTable } from "./interfaces";

/* Tables */
export const TABLES: IRawTable[] = [
    // GUI Version
    {
        name: "gui_version",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id          SMALLINT NOT NULL PRIMARY KEY,
                version     VARCHAR(15) NOT NULL
            );`
        }
    },

    // Server Alarms
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

    // Candlesticks
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

    // Prediction Candlesticks
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

    // Users
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

    // IP Blacklist
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

    // API Errors
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

    // Epochs
    {
        name: "epochs",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              VARCHAR(100) NOT NULL PRIMARY KEY,
                installed       BIGINT NOT NULL,
                uninstalled     BIGINT NULL,
                config          JSONB NOT NULL,
                model           JSONB NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_installed ON ${tableName}(installed);
            CREATE INDEX IF NOT EXISTS ${tableName}_uninstalled ON ${tableName}(uninstalled);`
        }
    },

    // Predictions
    {
        name: "predictions",
        sql: (tableName: string): string => {
            /**
             * In order to create the foreign key, the epoch"s table name must be derived
             * based on the mode the API is running in.
             */
            const epochsTableName: string = tableName.includes("test_") ? "test_epochs": "epochs";
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                t           BIGINT NOT NULL PRIMARY KEY,
                epoch_id    VARCHAR(100) NOT NULL REFERENCES ${epochsTableName}(id),
                r           SMALLINT NOT NULL,
                f           JSONB NOT NULL,
                s           NUMERIC(10,6) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_epoch_id ON ${tableName}(epoch_id);`
        }
    },


    // Epoch Prediction Candlesticks
    {
        name: "epoch_prediction_candlesticks",
        sql: (tableName: string): string => {
            /**
             * In order to create the foreign key, the epoch"s table name must be derived
             * based on the mode the API is running in.
             */
            const epochsTableName: string = tableName.includes("test_") ? "test_epochs": "epochs";
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                epoch_id    VARCHAR(100) NOT NULL REFERENCES ${epochsTableName}(id),
                ot          BIGINT NOT NULL PRIMARY KEY,
                ct          BIGINT NOT NULL,
                o           NUMERIC(10,6) NOT NULL,
                h           NUMERIC(10,6) NOT NULL,
                l           NUMERIC(10,6) NOT NULL,
                c           NUMERIC(10,6) NOT NULL,
                sm          NUMERIC(10,6) NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_epoch_id ON ${tableName}(epoch_id);`
        }
    },


    // Prediction Model Certificates
    {
        name: "prediction_model_certificates",
        sql: (tableName: string): string => {
            /**
             * In order to create the foreign key, the epoch"s table name must be derived
             * based on the mode the API is running in.
             */
            const epochsTableName: string = tableName.includes("test_") ? "test_epochs": "epochs";
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              VARCHAR(200) NOT NULL PRIMARY KEY,
                epoch_id        VARCHAR(100) NOT NULL REFERENCES ${epochsTableName}(id),
                certificate     JSONB NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_epoch_id ON ${tableName}(epoch_id);`
        }
    },


    // Regression Certificates
    {
        name: "regression_certificates",
        sql: (tableName: string): string => {
            /**
             * In order to create the foreign key, the epoch"s table name must be derived
             * based on the mode the API is running in.
             */
            const epochsTableName: string = tableName.includes("test_") ? "test_epochs": "epochs";
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              VARCHAR(200) NOT NULL PRIMARY KEY,
                epoch_id        VARCHAR(100) NOT NULL REFERENCES ${epochsTableName}(id),
                certificate     JSONB NOT NULL
            );
            CREATE INDEX IF NOT EXISTS ${tableName}_epoch_id ON ${tableName}(epoch_id);`
        }
    },

    
    // Position Strategy
    {
        name: "position_strategy",
        sql: (tableName: string): string => {
            return `CREATE TABLE IF NOT EXISTS ${tableName} (
                id              SMALLINT NOT NULL PRIMARY KEY,
                strategy        JSONB NOT NULL
            );`
        }
    },

    
    // Positions
    // ...
];