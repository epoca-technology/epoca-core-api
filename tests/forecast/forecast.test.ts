// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from '../../src/ioc';


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/shared/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Init Forecast Service
import { IForecastService } from "../../src/modules/shared/forecast";
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);






describe('Forecast Essentials: ',  function() {

    it('-', async function() {
        const series: ICandlestick[] = await _candlestick.get('BTC');
        await _forecast.forecast(series);
    });


});






