// API Container
import {appContainer, SYMBOLS, environment} from "./ioc";

/* Request Guard */
import {IRequestGuardService} from "./modules/request-guard";
const _guard = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);

/* Utilities */
import {IUtilitiesService} from "./modules/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

/* Notifications */
import {INotificationService} from "./modules/notification";
const _notification = appContainer.get<INotificationService>(SYMBOLS.NotificationService);



/* Import Modules that require initialization */


// Database
import {IDatabaseService} from "./modules/database";
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// Auth
import {IAuthService} from "./modules/auth";
const _auth = appContainer.get<IAuthService>(SYMBOLS.AuthService);

// Candlesticks
import {ICandlestickService} from "./modules/candlestick";
const _candlestick = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);

// Market State
import {IMarketStateService} from "./modules/market-state";
const _marketState = appContainer.get<IMarketStateService>(SYMBOLS.MarketStateService);

// Order Book
import {IOrderBookService} from "./modules/order-book";
const _orderBook = appContainer.get<IOrderBookService>(SYMBOLS.OrderBookService);

// Server
import {IServerService} from "./modules/server";
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);

// IP Blacklist
import {IIPBlacklistService} from "./modules/ip-blacklist";
const _ipBlacklist = appContainer.get<IIPBlacklistService>(SYMBOLS.IPBlacklistService);

// Epoch
import {IEpochService} from "./modules/epoch";
const _epoch = appContainer.get<IEpochService>(SYMBOLS.EpochService);

// Prediction
import {IPredictionService} from "./modules/prediction";
const _prediction = appContainer.get<IPredictionService>(SYMBOLS.PredictionService);

// Position
import {IPositionService} from "./modules/position";
const _position = appContainer.get<IPositionService>(SYMBOLS.PositionService);

// App Bulk Stream
import {IBulkDataService} from "./modules/bulk-data";
const _bulkData = appContainer.get<IBulkDataService>(SYMBOLS.BulkDataService);



/**
 * INITIALIZATION
 * Initializes the modules in the following order:
 * 1) Database Module
 * 2) Auth Module
 * 3) Candlestick Module
 * 4) Market State Module
 * 5) Order Book Module
 * 6) Server Module
 * 7) IP Blacklist Module
 * 8) Epoch Module
 * 9) Position Module
 * 10) Bulk Data Module
 * 
 * If any of the initialization actions triggers an error, it crashes the execution and
 * stop the following modules:
 * 1) Candlestick Module
 * 2) Order Book Module
 * 3) Market State Module
 * 4) Server Module
 * 5) Epoch Module
 * 6) Prediction Module
 * 7) Position Module
 * 8) Bulk Data Module
 */
export async function init(): Promise<void> {
    try { await _init() }
    catch (e) {
        await _utils.asyncDelay(15);
        try { await _init() }
        catch (e) {
            await _utils.asyncDelay(20);
            try { await _init() }
            catch (e) {
                await _utils.asyncDelay(20);
                try { await _init() }
                catch (e) {
                    try { await _init() }
                    catch (e) {
                        await _utils.asyncDelay(25);
                        try { await _init() }
                        catch (e) {
                            await _notification.apiInitError(e);
                            throw e;
                        }
                    }
                }
            }
        }
    }
}
async function _init(): Promise<void> {
    try {
        // Make sure that test mode is not being used in production
        if (environment.production && environment.testMode) {
            console.error("The API couldnt be initialized because test mode is not allowed in production.");
            throw new Error("The API couldnt be initialized because test mode is not allowed in production.");
        }

        // Make sure both, test & restore mode are not used simultaneously
        if (environment.testMode && environment.restoreMode) {
            console.error("The API can only be initialized on test or restore at a time. Both are not allowed.");
            throw new Error("The API can only be initialized on test or restore at a time. Both are not allowed.");
        }

        // Initialize the Database Module
        try {
            await _db.initialize();
        } catch (e) {
            console.error("Error when initializing the Database Module: ", e)
            throw e;
        }
        
        // Initialize the rest of the modules if it is not test or restore mode
        if (!environment.testMode && !environment.restoreMode) {
            // Initiaze the Auth Module
            try {
                await _auth.initialize();
            } catch (e) {
                console.error("Error when initializing the Auth Module: ", e)
                throw e;
            }

            // Initialize the Candlestick Syncing
            try {
                await _candlestick.initialize();
            } catch (e) {
                console.error("Error when initializing the Candlestick Module: ", e)
                throw e;
            }

            // Initialize the Market State
            try {
                await _marketState.initialize();
            } catch (e) {
                console.error("Error when initializing the Market State Module: ", e)
                throw e;
            }

            // Initialize the Order Book Syncing
            try {
                await _orderBook.initialize();
            } catch (e) {
                console.error("Error when initializing the Order Book Module: ", e)
                throw e;
            }
            
            // Initialize the Server Module
            try {
                await _server.initialize();
            } catch (e) {
                console.error("Error when initializing the Server Module: ", e)
                throw e;
            }

            // Initialize the IP Blacklist Module
            try {
                await _ipBlacklist.initialize();
            } catch (e) {
                console.error("Error when initializing the IP Blacklist Module: ", e)
                throw e;
            }

            // Initialize the Epoch Module
            try {
                await _epoch.initialize();
            } catch (e) {
                console.error("Error when initializing the Epoch Module: ", e)
                throw e;
            }

            // Initialize the Prediction Module
            try {
                await _prediction.initialize();
            } catch (e) {
                console.error("Error when initializing the Prediction Module: ", e)
                throw e;
            }

            // Initialize the Position Module
            try {
                await _position.initialize();
            } catch (e) {
                console.error("Error when initializing the Position Module: ", e)
                throw e;
            }

            // Initialize the Bulk Data Module
            try {
                await _bulkData.initialize();
            } catch (e) {
                console.error("Error when initializing the Bulk Data Module: ", e)
                throw e;
            }
        }

        // API is ready to accept requests
        _guard.apiInitialized = true;
    } catch (e) {
        // Stop the Candlestick Module
        _candlestick.stop();

        // Stop the Order Book Module
        _orderBook.stop();

        // Stop the Market State Module
        _marketState.stop();

        // Stop the Server Module
        _server.stop();

        // Stop the Epoch Module
        _epoch.stop();

        // Stop the Prediction Module
        _prediction.stop();

        // Stop the Positions Module
        _position.stop();

        // Stop the Bulk Data Module
        _bulkData.stop();

        // Rethrow the error
        throw e;
    }
}