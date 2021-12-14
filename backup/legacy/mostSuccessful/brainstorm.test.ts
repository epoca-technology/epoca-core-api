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
                series: getCandlestickSeries('110000_m'),
                //windowSize: 720, // 1 month
                //windowSize: 1000,
                windowSize: 1000,
                //windowSize: 500,
                //windowSize: 400,
                //windowSize: 300,
                //windowSize: 200,
                forecastConfig: {
                    tulipConfig: {
                        maDust: 0.1,
                        maPeriods: {
                            MA1: 7,
                            MA2: 25,
                            MA3: 60
                        },
                        spanImportance: {
                            oneMonth: 1,
                            twoWeeks: 1,
                            oneWeek: 1,
                            threeDays: 3,
                        },
                        verbose: 2,
                    },
                    arimaConfig: {
                        verbose: 0
                    },
                    verbose: 0
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

