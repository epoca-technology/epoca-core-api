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
import { IForecastResult, IForecastService } from "../../src/modules/forecast";
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);






describe('Forecast Essentials: ',  function() {

    it('-', async function() {
        const series: ICandlestick[] = await _candlestick.getLast(28800);
        const res: IForecastResult = await _forecast.forecast(
            series,
            undefined,
            undefined,
            /*{
                intervalMinutes: 30,
                verbose: 2,
                includeCandlesticksInResponse: false
            },
            {
                zoneSize: 0.5,
                zoneMergeDistanceLimit: 1.5,
                reversalCountRequirement: 1,
                verbose: 2
            }*/
        );
        console.log(res.keyZonesState);
    });


});






