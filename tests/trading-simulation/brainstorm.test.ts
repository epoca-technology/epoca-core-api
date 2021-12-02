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
import {getCandlestickSeries} from './data';




/*  */
describe('', function() {

    it('-', function() {
        try {
            const ts: ITradingSimulation = new TradingSimulation({
                series: getCandlestickSeries('1500'),
                //windowSize: 720, // 1 month
                windowSize: 60,
                forecastConfig: {
                    arimaConfig: {
                        verbose: 2
                    },
                    verbose: 2
                },
                balanceConfig: {
                    initial: 5000,
                    leverage: 5,
                    borrowInterestPercent: 0.02,
                    tradeFeePercent: 0.04,
                    minimumPositionAmount: 80,
                    allInMode: false,
                    verbose: 1
                },
                takeProfit: 0.5,
                stopLoss: 9,
                verbose: 1,
            });
            const result: ITradingSimulationResult = ts.run();
        } catch (e) {
            console.log(e);
            fail(_utils.getErrorMessage(e));
        }
    });

});

