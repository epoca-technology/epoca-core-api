// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../../ioc";
import * as prompt from 'prompt';


// Init the Utilities Service
import { IUtilitiesService } from "../../modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init the Candlestick Service
import { ICandlestick, ICandlestickService } from "../../modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "../../lib/TradingSimulation";



/**
 * CLI Initializer
 */
console.log('PAST TRADING SIMULATION');
console.log(' ');
prompt.start();


prompt.get([], async (e: any, data: prompt.Properties) => {
    if (e) throw e;

    //const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-01-2020'), _utils.getTimestamp('01-12-2020'));
    //const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-01-2018'));
    //const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-06-2020'), _utils.getTimestamp('31-12-2021'));
    const series: ICandlestick[] = await _candlestick.get();
    //const c = _candlestick.alterInterval(series, 5);
    try {
        const ts: ITradingSimulation = new TradingSimulation({
            series: series,
            //windowSize: 20000,
            //windowSize: 43200,
            windowSize: 525600,
            //windowSize: 105120, // 1y in 5 minute candlesticks
            balanceConfig: {
                initial: 10000,
                borrowInterestPercent: 0.02,
                tradeFeePercent: 0.04,
                minimumPositionAmount: 80,
                verbose: 1
            },
            meditationMinutes: 0,
            verbose: 1,
        });
        const result: ITradingSimulationResult = await ts.run();
    } catch (e) {
        console.log(e);
        //fail(_utils.getErrorMessage(e));
    }
});






