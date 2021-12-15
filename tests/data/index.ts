import { ICandlestickSeries } from '../../src/modules/shared/binance';
import * as fs from 'fs';


// Retriever
export function getCandlestickSeries(fileName: string): ICandlestickSeries {
    return JSON.parse(fs.readFileSync(`./tests/data/candlesticks/${fileName}.json`, 'utf8'));
}