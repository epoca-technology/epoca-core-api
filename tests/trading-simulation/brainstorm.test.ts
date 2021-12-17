// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from "../../src/ioc";


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);


// Init Candlestick Service
import { ICandlestickService, ICandlestick } from "../../src/modules/shared/candlestick";
const _candlestick: ICandlestickService = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);


// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "../../src/lib/TradingSimulation";






/*  */
describe('', function() {

    it('-', async function() {
        const series: ICandlestick[] = await _candlestick.get('BTC');
        try {
            const ts: ITradingSimulation = new TradingSimulation({
                series: series,
                windowSize: 1000,
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
            fail(_utils.getErrorMessage(e));
        }
    });

});

