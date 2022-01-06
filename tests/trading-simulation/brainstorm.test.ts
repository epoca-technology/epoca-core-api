// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from "../../src/ioc";


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "../../src/lib/TradingSimulation";






/*  */
describe('', function() {
    // Increase the timeout Interval
    beforeAll(() => { 
        jasmine.DEFAULT_TIMEOUT_INTERVAL = 400000;
    });



    it('-Trading Simulation', async function() {
        //const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-01-2020'), _utils.getTimestamp('01-12-2020'));
        const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-07-2021'));
        //const series: ICandlestick[] = await _candlestick.get(_utils.getTimestamp('01-06-2020'), _utils.getTimestamp('31-12-2021'));
        //const series: ICandlestick[] = await _candlestick.get();
        try {
            const ts: ITradingSimulation = new TradingSimulation({
                series: series,
                //windowSize: 20000,
                //windowSize: 43200,
                windowSize: 129600,
                balanceConfig: {
                    initial: 10000,
                    borrowInterestPercent: 0.02,
                    tradeFeePercent: 0.04,
                    minimumPositionAmount: 80,
                    verbose: 1
                },
                meditationMinutes: 60,
                verbose: 1,
            });
            const result: ITradingSimulationResult = await ts.run();
        } catch (e) {
            console.log(e);
            //fail(_utils.getErrorMessage(e));
        }
    });

});

