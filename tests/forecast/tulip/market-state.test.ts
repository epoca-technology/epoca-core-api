// Dependencies
import "reflect-metadata";
import {appContainer} from '../../../src/ioc';
import { ICandlestickSeries, SYMBOLS } from "../../../src/types";

import {MarketState} from "../../../src/lib/Forecast/MarketState"

// Init service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Series Data
import {getCandlestickSeries} from '../../data';


// Init test data
const td: ICandlestickSeries = getCandlestickSeries('720');




describe('',  function() {

    it('-', async function() {
        const td: ICandlestickSeries = getCandlestickSeries('1000');
        const ms = new MarketState();
        await ms.forecast(td.slice(0, 720));
    });



});



