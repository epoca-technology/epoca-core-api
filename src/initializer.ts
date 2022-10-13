// API Container
import {appContainer, SYMBOLS, environment} from "./ioc";

/* Request Guard */
import {IRequestGuardService} from "./modules/request-guard";
const _guard = appContainer.get<IRequestGuardService>(SYMBOLS.RequestGuardService);



/* Import Modules that require initialization */


// Auth
import {IAuthService} from "./modules/auth";
const _auth = appContainer.get<IAuthService>(SYMBOLS.AuthService);

// Candlesticks
import {ICandlestickService} from "./modules/candlestick";
const _candlestick = appContainer.get<ICandlestickService>(SYMBOLS.CandlestickService);

// Database
import {IDatabaseService} from "./modules/database";
const _db = appContainer.get<IDatabaseService>(SYMBOLS.DatabaseService);

// Epoch
import {IEpochService} from "./modules/epoch";
const _epoch = appContainer.get<IEpochService>(SYMBOLS.EpochService);

// Prediction
import {IPredictionService} from "./modules/prediction";
const _prediction = appContainer.get<IPredictionService>(SYMBOLS.PredictionService);

// IP Blacklist
import {IIPBlacklistService} from "./modules/ip-blacklist";
const _ipBlacklist = appContainer.get<IIPBlacklistService>(SYMBOLS.IPBlacklistService);

// Server
import {IServerService} from "./modules/server";
const _server = appContainer.get<IServerService>(SYMBOLS.ServerService);




/**
 * INITIALIZATION
 * Initializes the modules in the following order:
 * 1) Database Module
 * 2) Auth Module
 * 3) Candlestick Module
 * 4) Server Module
 * 5) IP Blacklist Module
 * 6) Epoch Module
 * 7) Epoch Module
 * 8) Trading Simulation Module
 * 9) Trading Session Module
 * 
 * If any of the initialization actions triggers an error, it crashes the execution and
 * stop the following modules:
 * 1) Candlestick Module
 * 2) Server Module
 * 3) Epoch Module
 * 4) Epoch Module
 * 5) Trading Simulation Module
 * 6) Trading Session Module
 */
export async function init(): Promise<void> {
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

            // Initialize the Epoch Module
            try {
                await _prediction.initialize();
            } catch (e) {
                console.error("Error when initializing the Prediction Module: ", e)
                throw e;
            }
            
            // Initialize the Trading Simulation Module
            try {
                // @TODO
            } catch (e) {
                console.error("Error when initializing the Trading Simulation Module: ", e)
                throw e;
            }

            // Initialize the Trading Session Module
            try {
                // @TODO
            } catch (e) {
                console.error("Error when initializing the Trading Session Module: ", e)
                throw e;
            }
        }

        // API is ready to accept requests
        _guard.apiInitialized = true;
    } catch (e) {
        // Stop the Candlestick Module
        _candlestick.stop();

        // Stop the Server Module
        _server.stop();

        // Stop the Epoch Module
        _epoch.stop();

        // Stop the Prediction Module
        _prediction.stop();

        // Stop the Trading Simulation Module
        // @TODO

        // Stop the Trading Sessions Module
        // @TODO

        // Rethrow the error
        throw e;
    }
}