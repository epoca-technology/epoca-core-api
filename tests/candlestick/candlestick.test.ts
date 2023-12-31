// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS, environment} from '../../src/ioc';

// Moment
import * as moment from 'moment';

// BigNumber
import {BigNumber} from "bignumber.js";

// Init the Utilities Service
import { IUtilitiesService } from "../../src/modules/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Database Service
import { IDatabaseService } from "../../src/modules/database";
const _db: IDatabaseService = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);


// Init the Candlesticks Service
import { ICandlestickService, ICandlestickModel, ICandlestick } from "../../src/modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);
const _model: ICandlestickModel = appContainer.get<ICandlestickModel>(SYMBOLS.CandlestickModel);


// Init the Binance Service
import { IBinanceCandlestick, IBinanceService } from "../../src/modules/binance";
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



// Make sure the API is running on test mode
if (!environment.testMode) throw new Error('Unit tests can only be performed when the containers are started in testMode.');




describe('Candlesticks DB Actions: ',  function() {
    // Increase the timeout Interval and enable testMode on candlesticks
    beforeAll(() => { 
        // Increase Timeout Interval to not stop Binance Requests
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;
    });

    // Clean the table before each test and once all tests have concluded
    beforeEach(async () => { 
        await Promise.all([
            _db.query({text: `DELETE FROM ${_db.tn.candlesticks};`}),
            _db.query({text: `DELETE FROM ${_db.tn.prediction_candlesticks};`}),
        ]);
    });
    afterAll(async () => { 
        // Clean the DB
        await Promise.all([
            _db.query({text: `DELETE FROM ${_db.tn.candlesticks};`}),
            _db.query({text: `DELETE FROM ${_db.tn.prediction_candlesticks};`}),
        ]);
    });


    


    it('-Can retrieve the last open timestamp: ', async function() {
        // If no data has been stored, it will retrieve the genesis timestamp
        let ot: number = await _model.getLastOpenTimestamp();
        expect(ot).toBe(_binance.candlestickGenesisTimestamp);
        
        // Save some candlesticks
        // @ts-ignore
        await _model.saveCandlesticks(_candlestick.processBinanceCandlesticks(tc));

        // Retrieve the last open timestamp again and should match the last saved candle
        ot = await _model.getLastOpenTimestamp();
        expect(ot).toBe(tc[tc.length - 1][0]);
    });




    it('-Can retrieve the last candlesticks: ', async function() {
        // Save some candlesticks
        // @ts-ignore
        await _model.saveCandlesticks(_candlestick.processBinanceCandlesticks(tc));

        // Retrieve the last 2 and make sure they match
        const c: ICandlestick[] = await _model.getLast(false, 2);
        expect(c[0].ot).toBe(tc[tc.length - 2][0]);
        expect(c[1].ot).toBe(tc[tc.length - 1][0]);
    });








    it('-Can retrieve all the candlesticks: ', async function() {
        // Processed
        // @ts-ignore
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _model.saveCandlesticks(processed);

        // Retrieve all the candlesticks and make sure they match the originals
        const c: ICandlestick[] = await _model.get();
        for (let i = 0; i < tc.length; i++) {
            // The records must be identical
            expect(processed[i].ot).toBe(c[i].ot);
            expect(processed[i].ct).toBe(c[i].ct);
            expect(processed[i].o).toBe(c[i].o);
            expect(processed[i].h).toBe(c[i].h);
            expect(processed[i].l).toBe(c[i].l);
            expect(processed[i].c).toBe(c[i].c);
            expect(processed[i].v).toBe(c[i].v);
        }
    });






    it('-Can retrieve candlesticks from a start timestamp: ', async function() {
        // Processed
        // @ts-ignore
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _model.saveCandlesticks(processed);

        // Retrieve the last 2 candlesticks
        const c: ICandlestick[] = await _model.get(processed[processed.length - 2].ot);
        expect(c.length).toBe(2);

        // Make sure they match
        expect(processed[processed.length - 2].ot).toBe(c[0].ot);
        expect(processed[processed.length - 1].ot).toBe(c[1].ot);
    });





    it('-Can retrieve candlesticks from a start timestamp limiting results: ', async function() {
        // Processed
        // @ts-ignore
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _model.saveCandlesticks(processed);

        // Retrieve the first 2 candlesticks
        let c: ICandlestick[] = await _model.get(processed[0].ot, undefined, 2);
        expect(c.length).toBe(2);

        // Make sure they match
        expect(processed[0].ot).toBe(c[0].ot);
        expect(processed[1].ot).toBe(c[1].ot);

        // Retrieve the last 3 candlesticks
        c = await _model.get(processed[processed.length - 3].ot, undefined, 3);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[processed.length - 3].ot).toBe(c[0].ot);
        expect(processed[processed.length - 2].ot).toBe(c[1].ot);
        expect(processed[processed.length - 1].ot).toBe(c[2].ot);
    });




    it('-Can retrieve candlesticks from an end timestamp: ', async function() {
        // Processed
        // @ts-ignore
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _model.saveCandlesticks(processed);

        // Retrieve the first 3 candlesticks
        const c: ICandlestick[] = await _model.get(undefined, processed[2].ot);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[0].ot).toBe(c[0].ot);
        expect(processed[1].ot).toBe(c[1].ot);
        expect(processed[2].ot).toBe(c[2].ot);
    });






    

    it('-Can retrieve candlesticks from a start and end timestamp: ', async function() {
        // Processed
        // @ts-ignore
        const processed: ICandlestick[] = _candlestick.processBinanceCandlesticks(tc);

        // Save some candlesticks
        await _model.saveCandlesticks(processed);

        // Retrieve the candlesticks from second to second to last
        const c: ICandlestick[] = await _model.get(processed[1].ot, processed[3].ot);
        expect(c.length).toBe(3);

        // Make sure they match
        expect(processed[1].ot).toBe(c[0].ot);
        expect(processed[2].ot).toBe(c[1].ot);
        expect(processed[3].ot).toBe(c[2].ot);
    });






    it('-Can save candlesticks from genesis with a correct sequence: ', async function() {
        // Retrieve the last candlestick open time - in the first lot it will be the genesis
        let startTS: number = await _model.getLastOpenTimestamp();
        expect(startTS).toBe(_binance.candlestickGenesisTimestamp);

        // Save the first lot
        // @ts-ignore
        const firstLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(firstLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _model.getLastOpenTimestamp();

        // The new start ts should match the last record from the first lot
        expect(firstLot.at(-1)!.ot).toBe(startTS);

        // Allow a small delay before saving the next candlesticks
        await _utils.asyncDelay(5);

        // Save the second lot
        // @ts-ignore
        const secondLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(secondLot.length).toBe(1000);
        
        // Retrieve the start ts again
        startTS = await _model.getLastOpenTimestamp();

        // The new start ts should match the last record from the second lot
        expect(secondLot.at(-1)!.ot).toBe(startTS);

        // Allow a small delay before saving the last candlesticks
        await _utils.asyncDelay(5);

        // Save the third lot
        // @ts-ignore
        const thirdLot: ICandlestick[] = await _candlestick.syncCandlesticks();
        expect(thirdLot.length).toBe(1000);

        // Retrieve the start ts again
        startTS = await _model.getLastOpenTimestamp();

        // The new start ts should match the last record from the first lot
        expect(thirdLot.at(-1)!.ot).toBe(startTS);

        // Download all the candlesticks stored in the db
        const candlesticks: ICandlestick[] = await _model.get();

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


        /* Prediction Candlesticks */

        // Download the existing prediction candlesticks
        const prediction: ICandlestick[] = await _model.get(undefined, undefined, undefined, true);

        // Check if the number of candlesticks is valid
        const qty: number = <number>_utils.outputNumber(
            new BigNumber(2998).dividedBy(_model.predictionConfig.intervalMinutes),
            {dp: 0, ru: true}
        );
        const safeQty: number = qty - 1; // Ignores the last candlestick in case it is incomplete
        expect(prediction.length).toBe(qty);
        
        // Make sure the last candlesticks match
        expect(candlesticks.at(-1)!.ct).toBe(prediction.at(-1)!.ct);
        expect(candlesticks.at(-1)!.c).toBe(prediction.at(-1)!.c);

        // Download the prediction candlesticks directly from Binance and compare them with the ones in the db
        await _utils.asyncDelay(5);
        const bCandlesticks: IBinanceCandlestick[] = await _binance.getCandlesticks(
            _model.predictionConfig.alias, 
            _binance.candlestickGenesisTimestamp, 
            undefined, 
            safeQty
        );
        // @ts-ignore
        const bProcessed: ICandlestick[] = _candlestick.processBinanceCandlesticks(bCandlesticks);

        // Iterate over each candlestick and make sure they match
        for (let i = 0; i < safeQty; i++) {
            // Check the open time
            if (bProcessed[i].ot != prediction[i].ot) fail(`Open Time Missmatch: ${bProcessed[i].ot} != ${prediction[i].ot}`);

            // Check the close time
            if (bProcessed[i].ct != prediction[i].ct) fail(`Close Time Missmatch: ${bProcessed[i].ct} != ${prediction[i].ct}`);
        }
    });
});














describe('Candlestick Endpoint: ', async function() {

    it('-Can retrieve candlesticks with valid parameters: ', async function() {
        try {
            await _candlestick.getForPeriod(moment().subtract(1, "days").valueOf(),Date.now(),15);
        } catch (e) {
            console.log(e);
            fail('It should have been able to retrieve candlesticks with valid parameters. 1');
        }

        try {
            await _candlestick.getForPeriod(moment().subtract(99, "hours").valueOf(),Date.now(),45);
        } catch (e) {
            console.log(e);
            fail('It should have been able to retrieve candlesticks with valid parameters. 2');
        }

        try {
            await _candlestick.getForPeriod(
                moment().subtract(2, "years").valueOf(),
                moment().subtract(1, "years").valueOf(),
                120
            );
        } catch (e) {
            console.log(e);
            fail('It should have been able to retrieve candlesticks with valid parameters. 3');
        }
    });



    it('-Cannot retrieve candlesticks with an invalid start: ', async function() {
        try {
            //@ts-ignore
            await _candlestick.getForPeriod("asdasd",Date.now(),15);
            fail('It should have not retrieved candlesticks with an invalid start. 1');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1300);
        }

        try {
            //@ts-ignore
            await _candlestick.getForPeriod("1234123",Date.now(),60);
            fail('It should have not retrieved candlesticks with an invalid start. 2');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1300);
        }
    });


    


    it('-Cannot retrieve candlesticks with an invalid end: ', async function() {
        try {
            //@ts-ignore
            await _candlestick.getForPeriod(Date.now(), "asdasd",15);
            fail('It should have not retrieved candlesticks with an invalid end. 1');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1300);
        }

        try {
            //@ts-ignore
            await _candlestick.getForPeriod(Date.now(), "1234123",60);
            fail('It should have not retrieved candlesticks with an invalid end. 2');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1300);
        }
    });





    it('-Cannot retrieve candlesticks if the start is equal or greater to the end: ', async function() {
        try {
            await _candlestick.getForPeriod(Date.now(), Date.now(),15);
            fail('It should have not retrieved candlesticks with a start thats equal or greater than the end. 1');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1301);
        }

        try {
            await _candlestick.getForPeriod(Date.now() + 1, Date.now(),15);
            fail('It should have not retrieved candlesticks with a start thats equal or greater than the end. 2');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1301);
        }
    });




    it('-Cannot retrieve candlesticks with an invalid interval: ', async function() {
        try {
            await _candlestick.getForPeriod(Date.now() - 1000, Date.now(), 0);
            fail('It should have not retrieved candlesticks with an invalid interval. 1');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1302);
        }

        try {
            // @ts-ignore
            await _candlestick.getForPeriod(Date.now() - 1000, Date.now(), "123");
            fail('It should have not retrieved candlesticks with an invalid interval. 2');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1302);
        }

        try {
            await _candlestick.getForPeriod(Date.now() - 1000, Date.now(), 5001);
            fail('It should have not retrieved candlesticks with an invalid interval. 3');
        } catch (e) {
            expect(_utils.getCodeFromApiError(e)).toBe(1302);
        }
    });
});


















describe('Candlestick Essentials: ',  function() {


    it('-Can alter the interval of a candlesticks list: ', function() {
        // Original
        // @ts-ignore
        const original: ICandlestick[] = _candlestick.processBinanceCandlesticks(TEST_BINANCE_CANDLESTICKS);
        expect(_model.alterInterval(original, 30).length).toBe(1);
        expect(_model.alterInterval(original, 15).length).toBe(2);
        expect(_model.alterInterval(original, 10).length).toBe(3);
        expect(_model.alterInterval(original, 5).length).toBe(6);
        expect(_model.alterInterval(original, 3).length).toBe(10);
        expect(_model.alterInterval(original, 2).length).toBe(15);
        expect(_model.alterInterval(original, 1).length).toBe(30);
    });







    it('-Can merge a list of candlesticks into one: ', function() {
        // Original
        const original: ICandlestick[] = [
            {ot: 1639676280000, ct: 1639676339999, o: 48106.3, h: 48143.06, l: 48091, c: 48091, v: 1183886.21},
            {ot: 1639676340000, ct: 1639676399999, o: 48091.01, h: 48104.29, l: 48075.41, c: 48092.18, v: 1948820.69},
            {ot: 1639676400000, ct: 1639676459999, o: 48092.18, h: 48097.24, l: 48060, c: 48082.95, v: 1387157.33},
            {ot: 1639676460000, ct: 1639676519999, o: 48082.95, h: 48124.65, l: 48078.15, c: 48095.28, v: 1042498.05},
            {ot: 1639676520000, ct: 1639676579999, o: 48095.29, h: 48131.57, l: 48078.78, c: 48083.35, v: 1302402.89},
        ];

        // Merge them into one
        const merged: ICandlestick = _model.mergeCandlesticks(original);
        
        // Validate the results
        expect(merged.ot).toBe(1639676280000);
        expect(merged.ct).toBe(1639676579999);
        expect(merged.o).toBe(48106.3);
        expect(merged.h).toBe(48143.06);
        expect(merged.l).toBe(48060);
        expect(merged.c).toBe(48083.35);
        expect(merged.v).toBe(6864765.17);
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
            {ot: 1639676280000, ct: 1639676339999, o: 48106.3, h: 48143.06, l: 48091, c: 48091, v: 1183886.21},
            {ot: 1639676340000, ct: 1639676399999, o: 48091.01, h: 48104.29, l: 48075.41, c: 48092.18, v: 1948820.69},
            {ot: 1639676400000, ct: 1639676459999, o: 48092.18, h: 48097.24, l: 48060, c: 48082.95, v: 1387157.33},
            {ot: 1639676460000, ct: 1639676519999, o: 48082.95, h: 48124.65, l: 48078.15, c: 48095.28, v: 1042498.05},
            {ot: 1639676520000, ct: 1639676579999, o: 48095.29, h: 48131.57, l: 48078.78, c: 48083.35, v: 1302402.89},
        ];

        // Process the raw candlesticks
        // @ts-ignore
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
        }
    });






    /**
     * @IMPORTANT
     * This test needs to be adjusted manually whenever the prediction interval is changed.
     */
    it('-Can calculate the close time of a prediction candlestick: ', function() {
        expect(_model.getPredictionCandlestickCloseTime(1502942400000)).toBe(1502943299999);
        expect(_model.getPredictionCandlestickCloseTime(1502944200000)).toBe(1502945099999);
        expect(_model.getPredictionCandlestickCloseTime(1502946000000)).toBe(1502946899999);
        expect(_model.getPredictionCandlestickCloseTime(1502947800000)).toBe(1502948699999);
        expect(_model.getPredictionCandlestickCloseTime(1502949600000)).toBe(1502950499999);
    });
});