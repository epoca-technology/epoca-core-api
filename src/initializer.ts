import {appContainer, SYMBOLS, environment} from "./ioc";


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

// Request Guard
import {IRequestGuardService} from './modules/request-guard';
const _guard = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


/**
 * Initializes the API modules.
 */
export async function init(): Promise<void> {
    // Make sure that test mode is not being used in production
    if (environment.production && environment.testMode) {
        throw new Error('The API couldnt be initialized because test mode is not allowed in production.');
    }

    // Initialize the Database Module
    await _db.initialize();

    // Initialize the rest of the modules if it is not test mode
    if (!environment.testMode) {
        // Initiaze the Auth Module
        // @TODO
        
        // Initialize the Server Module
        await _server.initialize();

        // Initialize the Candlestick Syncing
        await _candlestick.startSync();

        // Initialize the IP Blacklist Module
        // @TODO

        // Initialize the Trading Simulation Module
        // @TODO

        // Initialize the Trading Sessions Module
        // @TODO
    }

    // API is ready to accept requests
    _guard.apiInitialized = true;
}