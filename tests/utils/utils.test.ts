// Dependencies
import "reflect-metadata";
import {appContainer} from '../../src/ioc';
import {BigNumber} from 'bignumber.js';
import { ICandlestickSeries, IPriceSeries, SYMBOLS } from "../../src/types";


// Init service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);







/* Number Handling */
describe('Number Handling:', function() {

    it('-Can increase numbers by percentage', function() {
        // Init a list of numbers
        const vals: {originalNumber: number, percent: number, result: number}[] = [
            {originalNumber: 100, percent: 50, result: 150},
            {originalNumber: 100, percent: 100, result: 200},
            {originalNumber: 57700, percent: 1, result: 58277},
            {originalNumber: 57700, percent: 3.95, result: 59979.15},
        ];

        for (let v of vals) {
            expect(_utils.alterNumberByPercentage(v.originalNumber, v.percent)).toEqual(v.result);
            expect(_utils.calculatePercentageChange(v.originalNumber, v.result)).toEqual(v.percent);
        }
    });




    it('-Can decrease numbers by percentage', function() {
        // Init a list of numbers
        const vals: {originalNumber: number, percent: number, result: number}[] = [
            {originalNumber: 100, percent: -50, result: 50},
            {originalNumber: 100, percent: -90, result: 10},
            {originalNumber: 57700, percent: -2, result: 56546},
            {originalNumber: 56936.63, percent: -35, result: 37008.80},
        ];

        for (let v of vals) {
            expect(_utils.alterNumberByPercentage(v.originalNumber, v.percent)).toEqual(v.result);
            expect(_utils.calculatePercentageChange(v.originalNumber, v.result)).toEqual(v.percent);
        }
    });




    it('-Can calculate the average value from a list of numbers', function() {
        expect(_utils.calculateAverage([100,200,300,400,500])).toEqual(300);
        expect(_utils.calculateAverage([100.54,201.69,302.55,988.25,631.12])).toEqual(444.83);
    });



    it('-Can calculate the percentage change between 2 numbers', function() {
        expect(_utils.calculatePercentageChange(100, 50)).toEqual(-50);
        expect(_utils.calculatePercentageChange(100, 150)).toEqual(50);
        expect(_utils.calculatePercentageChange(100, 100)).toEqual(0);
    });


    it('-Can get the percent out of a number total', function() {
        expect(_utils.getPercentageOutOfTotal(50, 100)).toEqual(50);
        expect(_utils.getPercentageOutOfTotal(100, 1000)).toEqual(10);
        expect(_utils.getPercentageOutOfTotal(30, 100)).toEqual(30);
    });


    it('-Can round numbers in any format', function() {
        expect(_utils.roundNumber(1.5, 0)).toEqual(1);
        expect(_utils.roundNumber('1.5', 0, true)).toEqual(2);
        expect(_utils.roundNumber(new BigNumber(1.555), 2, true)).toEqual(1.56);
        expect(_utils.roundNumber(new BigNumber(1.555), 2)).toEqual(1.55);
    });



    it('-Can retrieve the correct number of decimals', function() {
        expect(_utils.getDecimalPlaces()).toEqual(2);
        expect(_utils.getDecimalPlaces(0)).toEqual(0);
        expect(_utils.getDecimalPlaces(3)).toEqual(3);
    });



    it('-Can retrieve the correct rounding mode', function() {
        expect(_utils.getRoundingMode()).toEqual(1);
        expect(_utils.getRoundingMode(false)).toEqual(1);
        expect(_utils.getRoundingMode(true)).toEqual(0);
    });
});
















/* List Filtering */
describe('List Filtering:', function() {
    it('-Can build a new list from a series with a specific key or index.', function() {
        // Init list
        const series: IPriceSeries = [
            [
                1635206400000,
                63228.21382584213
            ],
            [
                1635292800000,
                60604.18888794746
            ],
            [
                1635379200000,
                58641.00147419492
            ],
        ];

        // Build the timestamp list
        const timestampList: number[] = _utils.filterList(series, 0);

        // Build the price list
        const priceList: number[] = _utils.filterList(series, 1);

        // Iterate over each item and compare
        for (let i = 0; i < series.length; i++) {
            expect(series[i][0]).toEqual(timestampList[i]);
            expect(series[i][1]).toEqual(priceList[i]);
        }
    });




    it('-Can build a new list from a candlestick series with a specific key or index.', function() {
        // Init list
        const series: ICandlestickSeries = [
            [
                1638136800000,
                "56273.23000000",
                "56729.72000000",
                "56023.01000000",
                "56029.82000000",
                "2427.77250000",
                1638140399999,
                "136925605.72282380",
                86653,
                "1214.82610000",
                "68524696.12001700",
                "0"
            ],
            [
                1638140400000,
                "56029.81000000",
                "57445.05000000",
                "56000.00000000",
                "57274.88000000",
                "3468.78753000",
                1638143999999,
                "197760088.12035750",
                97925,
                "1959.72750000",
                "111749292.27241160",
                "0"
            ],
            [
                1638144000000,
                "57274.89000000",
                "57495.00000000",
                "57202.05000000",
                "57355.71000000",
                "621.43840000",
                1638147599999,
                "35656318.41093860",
                19094,
                "313.95947000",
                "18014843.65910670",
                "0"
            ]
        ];

        // Build the lists
        const open: string[] = _utils.filterList(series, 1);
        const high: string[] = _utils.filterList(series, 2);
        const low: string[] = _utils.filterList(series, 3);
        const close: string[] = _utils.filterList(series, 4);

        // Iterate over each item and compare
        for (let i = 0; i < series.length; i++) {
            expect(series[i][1]).toEqual(open[i]);
            expect(series[i][2]).toEqual(high[i]);
            expect(series[i][3]).toEqual(low[i]);
            expect(series[i][4]).toEqual(close[i]);
        }
    });




    it('-Can build a new list from a candlestick series with a specific key or index and change its format to a number.', function() {
        // Init list
        const series: ICandlestickSeries = [
            [
                1638136800000,
                "56273.23000000",
                "56729.72000000",
                "56023.01000000",
                "56029.82000000",
                "2427.77250000",
                1638140399999,
                "136925605.72282380",
                86653,
                "1214.82610000",
                "68524696.12001700",
                "0"
            ],
            [
                1638140400000,
                "56029.81000000",
                "57445.05000000",
                "56000.00000000",
                "57274.88000000",
                "3468.78753000",
                1638143999999,
                "197760088.12035750",
                97925,
                "1959.72750000",
                "111749292.27241160",
                "0"
            ],
            [
                1638144000000,
                "57274.89000000",
                "57495.00000000",
                "57202.05000000",
                "57355.71000000",
                "621.43840000",
                1638147599999,
                "35656318.41093860",
                19094,
                "313.95947000",
                "18014843.65910670",
                "0"
            ]
        ];

        // Build the lists
        const close: number[] = _utils.filterList(series, 4, 'toNumber');

        // Iterate over each item and compare
        for (let i = 0; i < series.length; i++) {
            expect(_utils.roundNumber(series[i][4], 2)).toEqual(close[i]);
            expect(typeof close[i]).toEqual("number");
        }
    });






    it('-Can build a new list from object keys.', function() {
        // Init list
        const series: {a: number, b: string, c: string}[] = [
            {a: 1, b: 'Hello from 1!', c: 'Goodbye from 1!'},
            {a: 2, b: 'Hello from 2!', c: 'Goodbye from 2!'},
            {a: 3, b: 'Hello from 3!', c: 'Goodbye from 3!'},
        ];

        // Build Lists
        const a: number[] = _utils.filterList(series, 'a');
        const b: string[] = _utils.filterList(series, 'b');
        const c: string[] = _utils.filterList(series, 'c');

        // Iterate over each item and compare
        for (let i = 0; i < series.length; i++) {
            expect(series[i].a).toEqual(a[i]);
            expect(series[i].b).toEqual(b[i]);
            expect(series[i].c).toEqual(c[i]);
        }
    });
});


























/* Error Handling */
describe('Error Handling:', function() {
    it('-Can retrieve an error message from a string.', function() {
        const test: string = 'Hey, this is a nasty error!!!!';
        expect(_utils.getErrorMessage(test)).toEqual(test);
    });

    it('-Can retrieve an error instance.', function() {
        const test: string = 'Hey, this is a nasty error!!!!';
        try {
            throw new Error(test)
        } catch (e) {
            expect(_utils.getErrorMessage(e)).toEqual(test);
        }
    });

    it('-Can retrieve an error message from an unknown object.', function() {
        const test: any = {foo: 'bar', mez: 'can', liz: 1};
        const obj: any = _utils.getErrorMessage(test);
        const newObj: any = JSON.parse(obj);
        expect(newObj.foo).toEqual(test.foo);
        expect(newObj.mez).toEqual(test.mez);
        expect(newObj.liz).toEqual(test.liz);
    });
});