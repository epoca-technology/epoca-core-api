import { ICandlestickSeries } from '../../../src/types';
import * as fs from 'fs';


// Retriever
export function getCandlestickSeries(fileName: string): ICandlestickSeries {
    return JSON.parse(fs.readFileSync(`./tests/trading-simulation/data/candlesticks/${fileName}.json`, 'utf8'));
}