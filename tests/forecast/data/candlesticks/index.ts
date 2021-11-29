


/* Candlesticks */
import { ICandlestickSeries } from '../../../../src/types';

// Raw Data
import {HOURLY_CANDLES_60} from './hourly/60';
import {HOURLY_CANDLES_90} from './hourly/90';
import {HOURLY_CANDLES_120} from './hourly/120';
import {HOURLY_CANDLES_150} from './hourly/150';
import {HOURLY_CANDLES_180} from './hourly/180';
import {HOURLY_CANDLES_210} from './hourly/210';
import {HOURLY_CANDLES_350} from './hourly/350';
import {HOURLY_CANDLES_500} from './hourly/500';
import {HOURLY_CANDLES_1000} from './hourly/1000';

// Retriever
export type ICandlestickTerm = 60|90|120|150|180|210|350|500|1000;
export function getHourlyCandlesticksByTerm(term: ICandlestickTerm): ICandlestickSeries {
    switch(term) {
        case 60:
            return HOURLY_CANDLES_60;
        case 90:
            return HOURLY_CANDLES_90;
        case 120:
            return HOURLY_CANDLES_120;
        case 150:
            return HOURLY_CANDLES_150;
        case 180:
            return HOURLY_CANDLES_180;
        case 210:
            return HOURLY_CANDLES_210;
        case 350:
            return HOURLY_CANDLES_350;
        case 500:
            return HOURLY_CANDLES_500;
        case 1000:
            return HOURLY_CANDLES_1000;
    }
}