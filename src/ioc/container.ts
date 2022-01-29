// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { candlestickModule } from "../modules/candlestick";
import { serverModule } from "../modules/server";


// Shared Modules
import { binanceModule } from "../modules/binance";
import { utilitiesModule } from "../modules/utilities";
import { externalRequestModule } from "../modules/external-request";
import { databaseModule } from "../modules/database";
import { notificationModule } from "../modules/notification";
import { forecastModule } from "../modules/forecast";
import { validationsModule } from "../modules/validations";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});


// Initialize Firebase
import {initializeApp, ServiceAccount, cert, App} from "firebase-admin/app";
const firebaseApp: App = initializeApp({credential: cert(<ServiceAccount>environment.firebaseServiceAccount)});



// Load the container
appContainer.load(
    /* Main */

    // Candlestick
    candlestickModule,

    // Server
    serverModule,
    
    /* Shared */


    // Forecast
    forecastModule,

    // Binance
    binanceModule,

    // Utilities
    utilitiesModule,

    // External Request
    externalRequestModule,

    // Database
    databaseModule,

    // Notification
    notificationModule,

    // Validations
    validationsModule,
);


// Export resolved container
export {appContainer};



