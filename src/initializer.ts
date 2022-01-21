import {appContainer, SYMBOLS} from "./ioc";


/* Import Modules */

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
    // Initialize the Server
    await _server.initialize();

    // Initialize the Candlestick Syncing
    await _candlestick.initializeSync();

    
}