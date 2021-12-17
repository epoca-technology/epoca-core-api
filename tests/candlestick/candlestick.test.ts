// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Moment
import * as moment from 'moment';

// Init the Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Database Service
import { IDatabaseService } from "../../src/modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);


// Init the Candlesticks Service
import { ICandlestickService, ICandlestick } from "../../src/modules/shared/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init the Binance Service
import { IBinanceCandlestick } from "../../src/modules/shared/binance";
//const _binance: IBinanceService = appContainer.get<IBinanceService>(SYMBOLS.BinanceService);


// Init the CryptoCurrency Service
import {ICryptoCurrencyService } from "../../src/modules/shared/cryptocurrency";
const _cCurrency: ICryptoCurrencyService = appContainer.get<ICryptoCurrencyService>(SYMBOLS.CryptoCurrencyService);



// Test Data
const tc: IBinanceCandlestick[] = [
    [1639676280000,"48106.30000000","48143.06000000","48091.00000000","48091.00000000","24.60676000",1639676339999,"1183886.21063830",963,"16.00469000","769983.71660560","0"],
    [1639676340000,"48091.01000000","48104.29000000","48075.41000000","48092.18000000","40.52686000",1639676399999,"1948820.69053810",1549,"26.21778000","1260723.02659290","0"],
    [1639676400000,"48092.18000000","48097.24000000","48060.00000000","48082.95000000","28.85115000",1639676459999,"1387157.33885190",1215,"12.04483000","579152.41948850","0"],
    [1639676460000,"48082.95000000","48124.65000000","48078.15000000","48095.28000000","21.67298000",1639676519999,"1042498.05020290",986,"14.29816000","687768.58757760","0"],
    [1639676520000,"48095.29000000","48131.57000000","48078.78000000","48083.35000000","27.07318000",1639676579999,"1302402.89166520",929,"12.36964000","595089.59287920","0"],
];









describe('Candlestick Basic DB Actions: ',  function() {
    // Increase the timeout Interval and enable testMode on candlesticks
    beforeAll(() => { 
        // Enable test mode on the candlesticks
        _candlestick.testMode = true;
    });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) });
    afterAll(async () => { 
        // Clean the DB
        await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) ;

        // Disable test mode
        _candlestick.testMode = false;
    });


    


    it('-Can retrieve the last open timestamp: ', async function() {
        // If no data has been stored, it will retrieve the genesis timestamp
        let ot: number = await _candlestick.getLastOpenTimestamp('BTC');
        expect(ot).toBe(_cCurrency.data['BTC'].genesisCandlestick);
        
        // Save some candlesticks
        await _candlestick.saveCandlesticks(_candlestick.processBinanceCandlesticks('BTC', tc));

        // Retrieve the last open timestamp again and should match the last saved candle
        ot = await _candlestick.getLastOpenTimestamp('BTC');
        expect(ot).toBe(tc[tc.length - 1][0]);
    });






    it('-Can retrieve the last candlesticks: ', async function() {
        // Save some candlesticks
        await _candlestick.saveCandlesticks(_candlestick.processBinanceCandlesticks('BTC', tc));

        // Retrieve the last 2 and make sure they match
        const c: ICandlestick[] = await _candlestick.getLast('BTC', 2);
        expect(c[0].ot).toBe(tc[tc.length - 2][0]);
        expect(c[1].ot).toBe(tc[tc.length - 1][0]);
    });






    it('-Can retrieve all the candlesticks: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks('BTC', tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve all the candlesticks and make sure they match the originals
        const c: ICandlestick[] = await _candlestick.get('BTC');
        for (let i = 0; i < tc.length; i++) {
            // The records must be identical - Except that the downloaded ones won't have the s property
            expect(processed[i].ot).toBe(c[i].ot);
            expect(processed[i].ct).toBe(c[i].ct);
            expect(processed[i].o).toBe(c[i].o);
            expect(processed[i].h).toBe(c[i].h);
            expect(processed[i].l).toBe(c[i].l);
            expect(processed[i].c).toBe(c[i].c);
            expect(processed[i].v).toBe(c[i].v);
            expect(processed[i].tbv).toBe(c[i].tbv);
        }
    });






    it('-Can retrieve candlesticks from a start timestamp: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks('BTC', tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the last 2 candlesticks
        const c: ICandlestick[] = await _candlestick.get('BTC', processed[processed.length - 2].ot);
        expect(c.length).toBe(2);

        // Make sure they match
        expect(processed[processed.length - 2].ot).toBe(c[0].ot);
        expect(processed[processed.length - 1].ot).toBe(c[1].ot);
    });




    it('-Can retrieve candlesticks from an end timestamp: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks('BTC', tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the first 3 candlesticks
        const c: ICandlestick[] = await _candlestick.get('BTC', undefined, processed[2].ot);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[0].ot).toBe(c[0].ot);
        expect(processed[1].ot).toBe(c[1].ot);
        expect(processed[2].ot).toBe(c[2].ot);
    });
});













describe('Candlestick Basic DB Actions: ',  function() {
    // Increase the timeout Interval and enable testMode on candlesticks
    beforeAll(() => { 
        // Increase Timeout Interval to not stop Binance Requests
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;

        // Enable test mode on the candlesticks
        _candlestick.testMode = true;
    });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) });
    afterAll(async () => { 
        // Clean the DB
        await _db.query({sql: 'DELETE FROM test_1m_candlesticks;'}) ;

        // Disable test mode
        _candlestick.testMode = false;
    });


    


    it('-Can save candlesticks from genesis with a correct sequence: ', async function() {
        // Retrieve the last candlestick open time - in the first lot it will be the genesis
        let startTS: number = await _candlestick.getLastOpenTimestamp('BTC');
        expect(startTS).toBe(_cCurrency.data['BTC'].genesisCandlestick);

        // Save the first lot
        const firstLot: ICandlestick[] = await _candlestick.saveCandlesticksFromStart('BTC', startTS);
        expect(firstLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp('BTC');

        // The new start ts should match the last record from the first lot
        expect(firstLot[firstLot.length - 1].ot).toBe(startTS);

        // Allow a small delay before saving the next candlesticks
        await _utils.asyncDelay(5);

        // Save the second lot
        const secondLot: ICandlestick[] = await _candlestick.saveCandlesticksFromStart('BTC', startTS);
        expect(secondLot.length).toBe(1000);
        
        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp('BTC');

        // The new start ts should match the last record from the second lot
        expect(secondLot[secondLot.length - 1].ot).toBe(startTS);

        // Allow a small delay before saving the last candlesticks
        await _utils.asyncDelay(5);

        // Save the third lot
        const thirdLot: ICandlestick[] = await _candlestick.saveCandlesticksFromStart('BTC', startTS);
        expect(thirdLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp('BTC');

        // The new start ts should match the last record from the first lot
        expect(thirdLot[thirdLot.length - 1].ot).toBe(startTS);

        // Download all the candlesticks stored in the db
        const candlesticks: ICandlestick[] = await _candlestick.get('BTC');

        // There should be 3k candles
        expect(candlesticks.length).toBe(3000);

        // Iterate over each candlestick and make sure they all follow a perfect sequence
        for (let i = 0; i < candlesticks.length; i++) {
            // Make sure that the next item exists so it can be compared
            if (candlesticks[i + 1]) {
                // Init the current ot
                const current = moment(candlesticks[i].ot);

                // Init the next ot
                const nextOT: number = candlesticks[i + 1].ot;

                // Make sure the sequence is followed
                expect(current.add(1, "minutes").valueOf()).toBe(nextOT);
            }
        }
    });
});



















describe('Candlestick Essentials: ',  function() {





    it('-Can process Binance candlesticks to the format in which they will be stored: ', async function() {
        // Raw
        const raw: IBinanceCandlestick[] = [
            [1639676280000,"48106.30000000","48143.06000000","48091.00000000","48091.00000000","24.60676000",1639676339999,"1183886.21063830",963,"16.00469000","769983.71660560","0"],
            [1639676340000,"48091.01000000","48104.29000000","48075.41000000","48092.18000000","40.52686000",1639676399999,"1948820.69053810",1549,"26.21778000","1260723.02659290","0"],
            [1639676400000,"48092.18000000","48097.24000000","48060.00000000","48082.95000000","28.85115000",1639676459999,"1387157.33885190",1215,"12.04483000","579152.41948850","0"],
            [1639676460000,"48082.95000000","48124.65000000","48078.15000000","48095.28000000","21.67298000",1639676519999,"1042498.05020290",986,"14.29816000","687768.58757760","0"],
            [1639676520000,"48095.29000000","48131.57000000","48078.78000000","48083.35000000","27.07318000",1639676579999,"1302402.89166520",929,"12.36964000","595089.59287920","0"],
        ];

        // Expected
        const expected: ICandlestick[] = [
            {ot: 1639676280000, ct: 1639676339999, o: "48106.3", h: "48143.06", l: "48091", c: "48091", v: "1183886.21", tbv: "769983.71", s: "BTC"},
            {ot: 1639676340000, ct: 1639676399999, o: "48091.01", h: "48104.29", l: "48075.41", c: "48092.18", v: "1948820.69", tbv: "1260723.02", s: "BTC"},
            {ot: 1639676400000, ct: 1639676459999, o: "48092.18", h: "48097.24", l: "48060", c: "48082.95", v: "1387157.33", tbv: "579152.41", s: "BTC"},
            {ot: 1639676460000, ct: 1639676519999, o: "48082.95", h: "48124.65", l: "48078.15", c: "48095.28", v: "1042498.05", tbv: "687768.58", s: "BTC"},
            {ot: 1639676520000, ct: 1639676579999, o: "48095.29", h: "48131.57", l: "48078.78", c: "48083.35", v: "1302402.89", tbv: "595089.59", s: "BTC"},
        ];

        // Process the raw candlesticks
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks('BTC', raw);

        // Iterate over each candlestick and make sure the processed values are correct
        for (let i = 0; i < raw.length; i++) {
            if (processed[i].ot != expected[i].ot) { fail(`Open Time: ${processed[i].ot} != ${expected[i].ot}`) }
            if (processed[i].ct != expected[i].ct) { fail(`Close Time: ${processed[i].ct} != ${expected[i].ct}`) }
            if (processed[i].o != expected[i].o) { fail(`Open Price: ${processed[i].o} != ${expected[i].o}`) }
            if (processed[i].h != expected[i].h) { fail(`High Price: ${processed[i].h} != ${expected[i].h}`) }
            if (processed[i].l != expected[i].l) { fail(`Low Price: ${processed[i].l} != ${expected[i].l}`) }
            if (processed[i].c != expected[i].c) { fail(`Close Price: ${processed[i].c} != ${expected[i].c}`) }
            if (processed[i].v != expected[i].v) { fail(`Volume: ${processed[i].v} != ${expected[i].v}`) }
            if (processed[i].tbv != expected[i].tbv) { fail(`Taker Buy Volume: ${processed[i].tbv} != ${expected[i].tbv}`) }
            if (processed[i].s != expected[i].s) { fail(`Symbol: ${processed[i].s} != ${expected[i].s}`) }
        }
    });
});