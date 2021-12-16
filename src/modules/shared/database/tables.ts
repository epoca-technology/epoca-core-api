/* Tables */
export const TABLES: string[] = [
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