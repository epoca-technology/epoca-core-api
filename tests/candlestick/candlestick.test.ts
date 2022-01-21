// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';

// Moment
import * as moment from 'moment';

// BigNumber
import {BigNumber} from "bignumber.js";

// Init the Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Database Service
import { IDatabaseService } from "../../src/modules/shared/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);


// Init the Candlesticks Service
import { ICandlestickService, ICandlestick } from "../../src/modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init the Binance Service
import { IBinanceCandlestick, IBinanceService } from "../../src/modules/shared/binance";
const _binance: IBinanceService = appContainer.get<IBinanceService>(SYMBOLS.BinanceService);



// Test Data
const tc: IBinanceCandlestick[] = [
    [1639676280000,"48106.30000000","48143.06000000","48091.00000000","48091.00000000","24.60676000",1639676339999,"1183886.21063830",963,"16.00469000","769983.71660560","0"],
    [1639676340000,"48091.01000000","48104.29000000","48075.41000000","48092.18000000","40.52686000",1639676399999,"1948820.69053810",1549,"26.21778000","1260723.02659290","0"],
    [1639676400000,"48092.18000000","48097.24000000","48060.00000000","48082.95000000","28.85115000",1639676459999,"1387157.33885190",1215,"12.04483000","579152.41948850","0"],
    [1639676460000,"48082.95000000","48124.65000000","48078.15000000","48095.28000000","21.67298000",1639676519999,"1042498.05020290",986,"14.29816000","687768.58757760","0"],
    [1639676520000,"48095.29000000","48131.57000000","48078.78000000","48083.35000000","27.07318000",1639676579999,"1302402.89166520",929,"12.36964000","595089.59287920","0"],
];
import {TEST_BINANCE_CANDLESTICKS} from "./data";








describe('Candlesticks DB Actions: ',  function() {
    // Increase the timeout Interval and enable testMode on candlesticks
    beforeAll(() => { 
        // Increase Timeout Interval to not stop Binance Requests
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;

        // Enable test mode on the candlesticks
        _candlestick.testMode = true;
    });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { 
        await Promise.all([
            _db.query({text: `DELETE FROM ${_db.getTestTableName(_candlestick.standardConfig.table)};`}),
            _db.query({text: `DELETE FROM ${_db.getTestTableName(_candlestick.forecastConfig.table)};`}),
        ]);
    });
    afterAll(async () => { 
        // Clean the DB
        await Promise.all([
            _db.query({text: `DELETE FROM ${_db.getTestTableName(_candlestick.standardConfig.table)};`}),
            _db.query({text: `DELETE FROM ${_db.getTestTableName(_candlestick.forecastConfig.table)};`}),
        ]);

        // Disable test mode
        _candlestick.testMode = false;
    });


    


    it('-Can retrieve the last open timestamp: ', async function() {
        // If no data has been stored, it will retrieve the genesis timestamp
        let ot: number = await _candlestick.getLastOpenTimestamp();
        expect(ot).toBe(_binance.candlestickGenesisTimestamp);
        
        // Save some candlesticks
        await _candlestick.saveCandlesticks(_candlestick.processBinanceCandlesticks(tc));

        // Retrieve the last open timestamp again and should match the last saved candle
        ot = await _candlestick.getLastOpenTimestamp();
        expect(ot).toBe(tc[tc.length - 1][0]);
    });




    it('-Can retrieve the last candlesticks: ', async function() {
        // Save some candlesticks
        await _candlestick.saveCandlesticks(_candlestick.processBinanceCandlesticks(tc));

        // Retrieve the last 2 and make sure they match
        const c: ICandlestick[] = await _candlestick.getLast(false, 2);
        expect(c[0].ot).toBe(tc[tc.length - 2][0]);
        expect(c[1].ot).toBe(tc[tc.length - 1][0]);
    });








    it('-Can retrieve all the candlesticks: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve all the candlesticks and make sure they match the originals
        const c: ICandlestick[] = await _candlestick.get();
        for (let i = 0; i < tc.length; i++) {
            // The records must be identical
            expect(processed[i].ot).toBe(c[i].ot);
            expect(processed[i].ct).toBe(c[i].ct);
            expect(processed[i].o).toBe(c[i].o);
            expect(processed[i].h).toBe(c[i].h);
            expect(processed[i].l).toBe(c[i].l);
            expect(processed[i].c).toBe(c[i].c);
            expect(processed[i].v).toBe(c[i].v);
            expect(processed[i].tbv).toBe(c[i].tbv);
            expect(processed[i].nt).toBe(c[i].nt);
        }
    });






    it('-Can retrieve candlesticks from a start timestamp: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the last 2 candlesticks
        const c: ICandlestick[] = await _candlestick.get(processed[processed.length - 2].ot);
        expect(c.length).toBe(2);

        // Make sure they match
        expect(processed[processed.length - 2].ot).toBe(c[0].ot);
        expect(processed[processed.length - 1].ot).toBe(c[1].ot);
    });





    it('-Can retrieve candlesticks from a start timestamp limiting results: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the first 2 candlesticks
        let c: ICandlestick[] = await _candlestick.get(processed[0].ot, undefined, 2);
        expect(c.length).toBe(2);

        // Make sure they match
        expect(processed[0].ot).toBe(c[0].ot);
        expect(processed[1].ot).toBe(c[1].ot);

        // Retrieve the last 3 candlesticks
        c = await _candlestick.get(processed[processed.length - 3].ot, undefined, 3);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[processed.length - 3].ot).toBe(c[0].ot);
        expect(processed[processed.length - 2].ot).toBe(c[1].ot);
        expect(processed[processed.length - 1].ot).toBe(c[2].ot);
    });




    it('-Can retrieve candlesticks from an end timestamp: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the first 3 candlesticks
        const c: ICandlestick[] = await _candlestick.get(undefined, processed[2].ot);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[0].ot).toBe(c[0].ot);
        expect(processed[1].ot).toBe(c[1].ot);
        expect(processed[2].ot).toBe(c[2].ot);
    });






    

    it('-Can retrieve candlesticks from a start and end timestamp: ', async function() {
        // Processed
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _candlestick.saveCandlesticks(processed);

        // Retrieve the candlesticks from second to second to last
        const c: ICandlestick[] = await _candlestick.get(processed[1].ot, processed[3].ot);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[1].ot).toBe(c[0].ot);
        expect(processed[2].ot).toBe(c[1].ot);
        expect(processed[3].ot).toBe(c[2].ot);
    });






    it('-Can save candlesticks from genesis with a correct sequence: ', async function() {
        // Retrieve the last candlestick open time - in the first lot it will be the genesis
        let startTS: number = await _candlestick.getLastOpenTimestamp();
        expect(startTS).toBe(_binance.candlestickGenesisTimestamp);

        // Save the first lot
        const firstLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(firstLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp();

        // The new start ts should match the last record from the first lot
        expect(firstLot.at(-1).ot).toBe(startTS);

        // Allow a small delay before saving the next candlesticks
        await _utils.asyncDelay(5);

        // Save the second lot
        const secondLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(secondLot.length).toBe(1000);
        
        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp();

        // The new start ts should match the last record from the second lot
        expect(secondLot.at(-1).ot).toBe(startTS);

        // Allow a small delay before saving the last candlesticks
        await _utils.asyncDelay(5);

        // Save the third lot
        const thirdLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(thirdLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _candlestick.getLastOpenTimestamp();

        // The new start ts should match the last record from the first lot
        expect(thirdLot.at(-1).ot).toBe(startTS);

        // Download all the candlesticks stored in the db
        const candlesticks: ICandlestick[] = await _candlestick.get();

        /**
         * There should be a total of 2998 candlesticks stored in the db. 
         * Even though 3 requests were made and should total 3k candlesticks, 
         * the last candlestick is always retrieved on following requests and 
         * updated instead of inserted.
         */
        expect(candlesticks.length).toBe(2998);

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


        /* Forecast Candlesticks */

        // Download the existing forecast candlesticks
        const forecast: ICandlestick[] = await _candlestick.get(undefined, undefined, undefined, true);

        // Check if the number of candlesticks is valid
        const qty: number = <number>_utils.outputNumber(
            new BigNumber(2998).dividedBy(_candlestick.forecastConfig.intervalMinutes),
            {dp: 0, ru: true}
        );
        const safeQty: number = qty - 1; // Ignores the last candlestick in case it is incomplete
        expect(forecast.length).toBe(qty);
        
        // Make sure the last candlesticks match
        expect(candlesticks.at(-1).ct).toBe(forecast.at(-1).ct);
        expect(candlesticks.at(-1).c).toBe(forecast.at(-1).c);

        // Download the forecast candlesticks directly from Binance and compare them with the ones in the db
        await _utils.asyncDelay(5);
        const bCandlesticks: IBinanceCandlestick[] = await _binance.getCandlesticks(
            _candlestick.forecastConfig.alias, 
            _binance.candlestickGenesisTimestamp, 
            undefined, 
            safeQty
        );
        const bProcessed: ICandlestick[] = _candlestick.processBinanceCandlesticks(bCandlesticks);

        // Iterate over each candlestick and make sure they match
        for (let i = 0; i < safeQty; i++) {
            // Check the open time
            if (bProcessed[i].ot != forecast[i].ot) fail(`Open Time Missmatch: ${bProcessed[i].ot} != ${forecast[i].ot}`);

            // Check the close time
            if (bProcessed[i].ct != forecast[i].ct) fail(`Close Time Missmatch: ${bProcessed[i].ct} != ${forecast[i].ct}`);
        }
    });
});












describe('Candlestick Essentials: ',  function() {

    it('-Can retrieve the db table for each candlestick type and testing mode: ', function() {
        /* Real Tables */
        // @ts-ignore
        expect(_candlestick.getTable()).toBe(_candlestick.standardConfig.table);
        // @ts-ignore
        expect(_candlestick.getTable(true)).toBe(_candlestick.forecastConfig.table);

        /* Test Tables */
        _candlestick.testMode = true;
        // @ts-ignore
        expect(_candlestick.getTable()).toBe(_db.getTestTableName(_candlestick.standardConfig.table));
        // @ts-ignore
        expect(_candlestick.getTable(true)).toBe(_db.getTestTableName(_candlestick.forecastConfig.table));
        _candlestick.testMode = false;

        /* Real Tables Again */
        // @ts-ignore
        expect(_candlestick.getTable()).toBe(_candlestick.standardConfig.table);
        // @ts-ignore
        expect(_candlestick.getTable(true)).toBe(_candlestick.forecastConfig.table);
    });



    it('-Can alter the interval of a candlesticks list: ', function() {
        // Original
        const original: ICandlestick[] = _candlestick.processBinanceCandlesticks(TEST_BINANCE_CANDLESTICKS);
        expect(_candlestick.alterInterval(original, 30).length).toBe(1);
        expect(_candlestick.alterInterval(original, 15).length).toBe(2);
        expect(_candlestick.alterInterval(original, 10).length).toBe(3);
        expect(_candlestick.alterInterval(original, 5).length).toBe(6);
        expect(_candlestick.alterInterval(original, 3).length).toBe(10);
        expect(_candlestick.alterInterval(original, 2).length).toBe(15);
        expect(_candlestick.alterInterval(original, 1).length).toBe(30);
    });







    it('-Can merge a list of candlesticks into one: ', function() {
        // Original
        const original: ICandlestick[] = [
            {ot: 1639676280000, ct: 1639676339999, o: 48106.3, h: 48143.06, l: 48091, c: 48091, v: 1183886.21, tbv: 769983.71, nt: 963},
            {ot: 1639676340000, ct: 1639676399999, o: 48091.01, h: 48104.29, l: 48075.41, c: 48092.18, v: 1948820.69, tbv: 1260723.02, nt: 1549},
            {ot: 1639676400000, ct: 1639676459999, o: 48092.18, h: 48097.24, l: 48060, c: 48082.95, v: 1387157.33, tbv: 579152.41, nt: 1215},
            {ot: 1639676460000, ct: 1639676519999, o: 48082.95, h: 48124.65, l: 48078.15, c: 48095.28, v: 1042498.05, tbv: 687768.58, nt: 986},
            {ot: 1639676520000, ct: 1639676579999, o: 48095.29, h: 48131.57, l: 48078.78, c: 48083.35, v: 1302402.89, tbv: 595089.59, nt: 929},
        ];

        // Merge them into one
        // @ts-ignore
        const merged: ICandlestick = _candlestick.mergeCandlesticks(original);
        
        // Validate the results
        expect(merged.ot).toBe(1639676280000);
        expect(merged.ct).toBe(1639676579999);
        expect(merged.o).toBe(48106.3);
        expect(merged.h).toBe(48143.06);
        expect(merged.l).toBe(48060);
        expect(merged.c).toBe(48083.35);
        expect(merged.v).toBe(6864765.17);
        expect(merged.tbv).toBe(3892717.31);
        expect(merged.nt).toBe(5642);
    });









    it('-Can process Binance candlesticks to the format in which they will be stored: ', function() {
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
            {ot: 1639676280000, ct: 1639676339999, o: 48106.3, h: 48143.06, l: 48091, c: 48091, v: 1183886.21, tbv: 769983.71, nt: 963},
            {ot: 1639676340000, ct: 1639676399999, o: 48091.01, h: 48104.29, l: 48075.41, c: 48092.18, v: 1948820.69, tbv: 1260723.02, nt: 1549},
            {ot: 1639676400000, ct: 1639676459999, o: 48092.18, h: 48097.24, l: 48060, c: 48082.95, v: 1387157.33, tbv: 579152.41, nt: 1215},
            {ot: 1639676460000, ct: 1639676519999, o: 48082.95, h: 48124.65, l: 48078.15, c: 48095.28, v: 1042498.05, tbv: 687768.58, nt: 986},
            {ot: 1639676520000, ct: 1639676579999, o: 48095.29, h: 48131.57, l: 48078.78, c: 48083.35, v: 1302402.89, tbv: 595089.59, nt: 929},
        ];

        // Process the raw candlesticks
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(raw);

        // Iterate over each candlestick and make sure the processed values are correct
        for (let i = 0; i < raw.length; i++) {
            if (processed[i].ot != expected[i].ot) { fail(`Open Time: ${processed[i].ot} != ${expected[i].ot}`) }
            if (processed[i].ct != expected[i].ct) { fail(`Close Time: ${processed[i].ct} != ${expected[i].ct}`) }
            if (processed[i].o != expected[i].o) { fail(`Open Price: ${processed[i].o} != ${expected[i].o}`) }
            if (processed[i].h != expected[i].h) { fail(`High Price: ${processed[i].h} != ${expected[i].h}`) }
            if (processed[i].l != expected[i].l) { fail(`Low Price: ${processed[i].l} != ${expected[i].l}`) }
            if (processed[i].c != expected[i].c) { fail(`Close Price: ${processed[i].c} != ${expected[i].c}`) }
            if (processed[i].v != expected[i].v) { fail(`Volume: ${processed[i].v} != ${expected[i].v}`) }
            if (processed[i].tbv != expected[i].tbv) { fail(`Volume: ${processed[i].tbv} != ${expected[i].tbv}`) }
            if (processed[i].nt != expected[i].nt) { fail(`Volume: ${processed[i].nt} != ${expected[i].nt}`) }
        }
    });






    /**
     * @IMPORTANT
     * This test needs to be adjusted manually whenever the forecast interval is changed.
     */
    it('-Can calculate the close time of a forecast candlestick: ', function() {
        // @ts-ignore
        expect(_candlestick.getForecastCandlestickCloseTime(1502942400000)).toBe(1502944199999);
        // @ts-ignore
        expect(_candlestick.getForecastCandlestickCloseTime(1502944200000)).toBe(1502945999999);
        // @ts-ignore
        expect(_candlestick.getForecastCandlestickCloseTime(1502946000000)).toBe(1502947799999);
        // @ts-ignore
        expect(_candlestick.getForecastCandlestickCloseTime(1502947800000)).toBe(1502949599999);
        // @ts-ignore
        expect(_candlestick.getForecastCandlestickCloseTime(1502949600000)).toBe(1502951399999);
    });
});