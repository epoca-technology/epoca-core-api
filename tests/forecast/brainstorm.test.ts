// Dependencies
import "reflect-metadata";


// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "./lib";


// Series Data
import {getCandlestickSeries} from './data';




/*  */
describe('', function() {

    it('-', function() {
        const ts: ITradingSimulation = new TradingSimulation({
            series: getCandlestickSeries('4000'),
            windowSize: 720, // 1 month
            verbose: true,
        });
        const result: ITradingSimulationResult = ts.run();
    });

});

