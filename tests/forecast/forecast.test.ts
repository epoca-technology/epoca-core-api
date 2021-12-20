// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init Forecast Service
import { IForecastService } from "../../src/modules/forecast";
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);






describe('Forecast Essentials: ',  function() {

    it('-', async function() {
        const series: ICandlestick[] = await _candlestick.getLast('BTC', 1000);
        await _forecast.forecast(series);
    });


});






