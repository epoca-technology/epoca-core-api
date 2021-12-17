// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Test Data
import { TEST_BINANCE_CANDLESTICKS } from "./data";


// Init the Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/shared/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init the Database Service
import { IDatabaseService } from "../../src/modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);





describe('Database Essentials: ',  function() {
    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) });
    afterAll(async () => { await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) });



    

    it('-Can store a set of processed candlesticks, retrieve them and validate their integrity: ', async function() {
        // Initialize the first and last open timestamps
        const first: ICandlestick = _candlestick.processBinanceCandlesticks('BTC', [TEST_BINANCE_CANDLESTICKS[0]])[0];
        const last: ICandlestick = _candlestick.processBinanceCandlesticks('BTC', [TEST_BINANCE_CANDLESTICKS[TEST_BINANCE_CANDLESTICKS.length - 1]])[0];

        // There should be no records stored
        const empty: ICandlestick[] = await _db.query({sql: 'SELECT * FROM test_1m_candlesticks;'});
        expect(empty.length).toBe(0);

        // Process the raw candlesticks
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks('BTC', TEST_BINANCE_CANDLESTICKS);

        // Build the insert query
        const insertQuery: string = 'INSERT INTO test_1m_candlesticks (ot, ct, o, h, l, c, v, tbv, s) VALUES ?';

        // Build the values
        let values: any[] = [];
        for (let c of processed) {
            values.push([c.ot, c.ct, c.o, c.h, c.l, c.c, c.v, c.tbv, 'BTC']);
        }

        // Store the data in the DB
        const firstInsertResponse: any = await _db.query({sql: insertQuery, values: [values]});
        expect(firstInsertResponse.affectedRows).toBe(processed.length);

        // Cannot Insert a candlestick that already exists
        try {
            await _db.query({sql: insertQuery, values: [
                [[last.ot, last.ct, last.o, last.h, last.l, last.c, last.v, last.tbv, 'BTC']]
            ]});
            fail(`It should have not inserted a candlestick that already exists ${last.ot}.`);
        } catch (e) {
            if (!e.message.includes('ER_DUP_ENTRY')) fail(e);
        }

        // Retrieve all the candlesticks and make sure the numbers add up
        const candlesticks: ICandlestick[] = await _db.query({sql: 'SELECT * FROM test_1m_candlesticks ORDER BY ot ASC'});
        expect(candlesticks.length).toBe(processed.length);

        // Iterate over the candlesticks and validate their integrity
        for (let i = 0; i < processed.length; i++) {
            if (stringify(processed[i]) != stringify(candlesticks[i])) {
                fail(`Candlestick ${processed[i].ot} integrity check failed.`);
            }
        }

        // Can retrieve the candlesticks in descending order
        const descCandlesticks: ICandlestick[] = await _db.query({sql: 'SELECT * FROM test_1m_candlesticks ORDER BY ot DESC'});
        expect(descCandlesticks.length).toBe(processed.length);

        // The first item in the desc list should be the last one in the original list
        if (stringify(last) != stringify(descCandlesticks[0])) {
            fail(`In a desc list the first candlestick should have been ${last.ot}`);
        }

        // The last item in the desc list should be the first one in the original list
        if (stringify(first) != stringify(descCandlesticks[descCandlesticks.length - 1])) {
            fail(`In a desc list the last candlestick should have been ${first.ot}`);
        }
    });
});






