// Dependencies
import "reflect-metadata";
import {appContainer} from "../../src/ioc";
import { SYMBOLS } from "../../src/types";


// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "../../src/lib/TradingSimulation";


// Series Data
import {getCandlestickSeries} from '../data';




/*  */
describe('', function() {

    it('-', async function() {
        try {
            const ts: ITradingSimulation = new TradingSimulation({
                series: getCandlestickSeries('10000'),
                windowSize: 720, // 1 month
                forecastConfig: {
                    tulipConfig: {
                        verbose: 2
                    },
                    verbose: 2
                },
                balanceConfig: {
                    initial: 5000,
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
            fail(_utils.getErrorMessage(e));
        }
    });

});

