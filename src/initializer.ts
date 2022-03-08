// API Container
import {appContainer, SYMBOLS, environment} from "./ioc";

/* Request Guard */
import {IRequestGuardService} from './modules/request-guard';
const _guard = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);


/* Import Modules that require initialization */

// Auth
import {IAuthService} from './modules/auth';
const _auth = appContainer.get<IAuthService>(SYMBOLS.AuthService);

// Candlesticks
import {ICandlestickService} from './modules/candlestick';
const _candlestick = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);

// Database
import {IDatabaseService} from './modules/database';
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// IP Blacklist
import {IIPBlacklistService} from './modules/ip-blacklist';
const _ipBlacklist = appContainer.get<IIPBlacklistService>(SYMBOLS.IPBlacklistService);

// Server
import {IServerService} from './modules/server';
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);




/**
 * Initializes the API modules.
 */
export async function init(): Promise<void> {
    // Make sure that test mode is not being used in production
    if (environment.production && environment.testMode) {
        throw new Error('The API couldnt be initialized because test mode is not allowed in production.');
    }

    // Make sure both, test & restore mode are not used simultaneously
    if (environment.testMode && environment.restoreMode) {
        throw new Error('The API can only be initialized on test or restore at a time. Both are not allowed.');
    }

    // Initialize the Database Module
    await _db.initialize();

    // Initialize the rest of the modules if it is not test or restore mode
    if (!environment.testMode && !environment.restoreMode) {
        // Initiaze the Auth Module
        await _auth.initialize();
        
        // Initialize the Server Module
        await _server.initialize();

        // Initialize the Candlestick Syncing
        await _candlestick.startSync();

        // Initialize the IP Blacklist Module
        await _ipBlacklist.initialize();

        // Initialize the Trading Simulation Module
        // @TODO

        // Initialize the Trading Sessions Module
        // @TODO
    }

    // API is ready to accept requests
    _guard.apiInitialized = true;
}