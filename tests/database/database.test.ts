// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Object Stringifier
import * as stringify from 'json-stable-stringify';

// Test Data
import { TEST_BINANCE_CANDLESTICKS } from "./data";


// Init the Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init the Database Service
import { IDatabaseService, IPoolClient, IQueryResult } from "../../src/modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);





describe('Database Essentials: ',  function() {
    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { await _db.query({text: 'DELETE FROM test_candlesticks;'}) });
    afterAll(async () => { await _db.query({text: 'DELETE FROM test_candlesticks;'}) });



    

    it('-Can store a set of processed candlesticks, retrieve them and validate their integrity: ', async function() {
        // Initialize the DB Client
        const client: IPoolClient = await _db.pool.connect();

        try {
            // Initialize the first and last open timestamps
            const first: ICandlestick = _candlestick.processBinanceCandlesticks([TEST_BINANCE_CANDLESTICKS[0]])[0];
            const last: ICandlestick = _candlestick.processBinanceCandlesticks([TEST_BINANCE_CANDLESTICKS[TEST_BINANCE_CANDLESTICKS.length - 1]])[0];

            // There should be no records stored
            const empty: IQueryResult = await client.query({text: 'SELECT * FROM test_candlesticks;'});
            expect(empty.rows.length).toBe(0);

            // Process the raw candlesticks
            const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(TEST_BINANCE_CANDLESTICKS);

            // Insert the candlesticks in the db
            for (let c of processed) {
                await client.query({
                    text: `
                        INSERT INTO test_candlesticks(ot, ct, o, h, l, c, v, tbv) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `,
                    values: [c.ot, c.ct, c.o, c.h, c.l, c.c, c.v, c.tbv]
                });
            }


            // Cannot Insert a candlestick that already exists
            try {
                await client.query({
                    text: `
                        INSERT INTO test_candlesticks(ot, ct, o, h, l, c, v, tbv) 
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `,
                    values: [last.ot, last.ct, last.o, last.h, last.l, last.c, last.v, last.tbv]
                });
                fail(`It should have not inserted a candlestick that already exists ${last.ot}.`);
            } catch (e) {
                if (!e.message.includes('duplicate') && !e.message.includes('duplicada')) {
                    throw new Error('Should have received a duplicate error when attempting to insert the same candlestick twice');
                }
            }

            // Retrieve all the candlesticks and make sure the numbers add up
            const all: IQueryResult = await client.query({text: 'SELECT * FROM test_candlesticks ORDER BY ot ASC'});
            expect(all.rows.length).toBe(processed.length);

            // Iterate over the candlesticks and validate their integrity
            for (let i = 0; i < processed.length; i++) {
                if (stringify(processed[i]) != stringify(all.rows[i])) {
                    console.log(processed[i]);
                    console.log(all.rows[i]);
                    fail(`Candlestick ${processed[i].ot} integrity check failed.`);
                }
            }

            // Can retrieve the candlesticks in descending order
            const descCandlesticks: IQueryResult = await client.query({text: 'SELECT * FROM test_candlesticks ORDER BY ot DESC'});
            expect(descCandlesticks.rows.length).toBe(processed.length);


            // The first item in the desc list should be the last one in the original list
            if (stringify(last) != stringify(descCandlesticks.rows[0])) {
                fail(`In a desc list the first candlestick should have been ${last.ot}`);
            }

            // The last item in the desc list should be the first one in the original list
            if (stringify(first) != stringify(descCandlesticks.rows[descCandlesticks.rows.length - 1])) {
                fail(`In a desc list the last candlestick should have been ${first.ot}`);
            }
        } finally {
            client.release();
        }
    });
});






