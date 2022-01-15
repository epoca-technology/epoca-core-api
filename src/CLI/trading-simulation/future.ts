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
console.log('FUTURE TRADING SIMULATION');
console.log(' ');
prompt.start();




prompt.get([], async (e: any, data: prompt.Properties) => {
    if (e) throw e;


});






