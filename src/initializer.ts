import {appContainer, SYMBOLS} from "./ioc";


/* Import Modules */

// Database
import {IDatabaseService} from './modules/database';
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// Server
import {IServerService} from './modules/server';
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);

// Candlesticks
import {ICandlestickService} from './modules/candlestick';
const _candlestick = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);



/**
 * Initializes the API modules.
 */
export async function init(): Promise<void> {
    // Initialize the Database Module
    await _db.initialize();

    // Initiaze the User Module
    // @TODO
    
    // Initialize the Server Module
    await _server.initialize();

    // Initialize the Candlestick Syncing
    //await _candlestick.initializeSync();

    // Initialize the Trading Simulation Module
    // @TODO

    // Initialize the Trading Session Module
    // @TODO
}