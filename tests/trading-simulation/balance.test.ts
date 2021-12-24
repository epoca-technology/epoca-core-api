// Dependencies
import "reflect-metadata";
import {appContainer, SYMBOLS} from "../../src/ioc";
import { BalanceSimulation, IBalanceSimulation } from "../../src/lib/TradingSimulation";

// Init Utilities Service
import { IUtilitiesService } from "../../src/modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);




/*  */
xdescribe('Balance Simulation Tests', function() {

    it('-', function() {
        const bs: IBalanceSimulation = new BalanceSimulation({
            initial: 100,
            verbose: 0
        });
        /*bs.onPositionClose({
            type: 'long',
            forecast: {result: 1},
            openTime: 0,
            openPrice: 58629.02,
            closePrice: 58502.74,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            outcome: false
        });*/
        /*bs.onPositionClose({
            type: 'long',
            forecast: {result: 1},
            openTime: 0,
            openPrice: 58629.02,
            closePrice: 59502.74,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            outcome: true
        });*/
        /*bs.onPositionClose({
            type: 'short',
            forecast: {result: 1},
            openTime: 0,
            openPrice: 58629.02,
            closePrice: 58302.74,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            outcome: true
        });*/
        bs.onPositionClose({
            type: 'short',
            forecast: {result: 1},
            openTime: 0,
            openPrice: 58302.74,
            closePrice: 58629.02,
            takeProfitPrice: 0,
            stopLossPrice: 0,
            outcome: false
        });
    });

});

