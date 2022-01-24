// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { candlestickModule } from "../modules/candlestick";
import { serverModule } from "../modules/server";


// Shared Modules
import { binanceModule } from "../modules/shared/binance";
import { utilitiesModule } from "../modules/shared/utilities";
import { externalRequestModule } from "../modules/shared/external-request";
import { databaseModule } from "../modules/shared/database";
import { notificationModule } from "../modules/shared/notification";
import { forecastModule } from "../modules/shared/forecast";
import { validationsModule } from "../modules/shared/validations";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




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



