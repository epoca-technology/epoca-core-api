// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';
import { ICandlestickSeries } from "../../src/modules/shared/binance";


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Forecast Service
import { IForecastService } from "../../src/modules/shared/forecast";
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);


// Series Data
import {getCandlestickSeries} from '../data';




describe('Forecast Essentials: ',  function() {

    it('-', async function() {
        const series: ICandlestickSeries = getCandlestickSeries('1500');
        await _forecast.forecast(series);
    });


});






