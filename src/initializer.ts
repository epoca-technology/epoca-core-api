import {appContainer, SYMBOLS} from "./ioc";


/* Import Modules */

// Candlesticks
import {ICandlestickService} from './modules/candlestick';
const _candlestick = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);




/**
 * Initializes the API modules.
 */
export async function init(): Promise<void> {
    // Initialize the candlestick syncing
    await _candlestick.initializeSync();

    
}