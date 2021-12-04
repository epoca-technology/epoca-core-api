// Dependencies
import "reflect-metadata";
import {appContainer} from '../../../src/ioc';
import {BigNumber} from 'bignumber.js';
import { ICandlestickSeries, IPriceSeries, SYMBOLS } from "../../../src/types";

import {Tulip, ITulip} from "../../../src/lib/Forecast/Tulip"

// Init service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Series Data
import {getCandlestickSeries} from '../../data';




/*  */
describe(':', async function() {

    it('-', async function() {
        const t: ITulip = new Tulip(getCandlestickSeries('1000').slice(0, 15), {verbose: 2});
        await t.forecast();
    });
});








