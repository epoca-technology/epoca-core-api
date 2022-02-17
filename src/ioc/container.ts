// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { authModule } from "../modules/auth";
import { binanceModule } from "../modules/binance";
import { candlestickModule } from "../modules/candlestick";
import { databaseModule } from "../modules/database";
import { externalRequestModule } from "../modules/external-request";
import { forecastModule } from "../modules/forecast";
import { guiVersionModule } from "../modules/gui-version";
import { notificationModule } from "../modules/notification";
import { requestGuardModule } from "../modules/request-guard";
import { serverModule } from "../modules/server";
import { utilitiesModule } from "../modules/utilities";
import { validationsModule } from "../modules/validations";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});


// Initialize Firebase
import {initializeApp, ServiceAccount, cert, App} from "firebase-admin/app";
const firebaseApp: App = initializeApp({credential: cert(<ServiceAccount>environment.firebaseServiceAccount)});



// Load the container
appContainer.load(
    // Auth
    authModule,

    // Binance
    binanceModule,

    // Candlestick
    candlestickModule,

    // Database
    databaseModule,

    // External Request
    externalRequestModule,

    // Forecast
    forecastModule,

    // GUI Version
    guiVersionModule,

    // Notification
    notificationModule,

    // Request Guard
    requestGuardModule,

    // Server
    serverModule,

    // Utilities
    utilitiesModule,

    // Validations
    validationsModule,
);


// Export resolved container
export {appContainer};



