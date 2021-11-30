// Dependencies
import "reflect-metadata";
import {appContainer} from '../../src/ioc';
import {BigNumber} from 'bignumber.js';
import { ICandlestickSeries, IPriceSeries, SYMBOLS } from "../../src/types";


// Trading Simulation
import {TradingSimulation, ITradingSimulation, ITradingSimulationResult} from "./lib";







/*  */
describe('', function() {

    it('-', function() {
        const ts: ITradingSimulation = new TradingSimulation({
            seriesTerm: 1000,
            windowSize: 60,
            verbose: true,
        });
        const result: ITradingSimulationResult = ts.run();
    });

});

