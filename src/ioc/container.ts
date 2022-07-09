// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { apiErrorModule } from "../modules/api-error";
import { authModule } from "../modules/auth";
import { binanceModule } from "../modules/binance";
import { candlestickModule } from "../modules/candlestick";
import { databaseModule } from "../modules/database";
import { externalRequestModule } from "../modules/external-request";
import { fileManagerModule } from "../modules/file-manager";
import { predictionModule } from "../modules/prediction";
import { guiVersionModule } from "../modules/gui-version";
import { ipBlacklistModule } from "../modules/ip-blacklist";
import { notificationModule } from "../modules/notification";
import { requestGuardModule } from "../modules/request-guard";
import { serverModule } from "../modules/server";
import { utilitiesModule } from "../modules/utilities";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});


// Initialize Firebase
import {initializeApp, ServiceAccount, cert, App} from "firebase-admin/app";
const firebaseApp: App = initializeApp({
    credential: cert(<ServiceAccount>environment.firebase.serviceAccount),
    databaseURL: environment.firebase.databaseURL,
    storageBucket: environment.firebase.storageBucket,
});



// Load the container
appContainer.load(
    // API Error
    apiErrorModule,
    
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

    // File Manager
    fileManagerModule,

    // Prediction
    predictionModule,

    // GUI Version
    guiVersionModule,

    // IP Blacklist
    ipBlacklistModule,

    // Notification
    notificationModule,

    // Request Guard
    requestGuardModule,

    // Server
    serverModule,

    // Utilities
    utilitiesModule,
);


// Export resolved container
export {appContainer};



