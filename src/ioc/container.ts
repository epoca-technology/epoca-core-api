// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { candlestickModule } from "../modules/candlestick";


// Shared Modules
import { binanceModule } from "../modules/shared/binance";
import { utilitiesModule } from "../modules/shared/utilities";
import { externalRequestModule } from "../modules/shared/external-request";
import { databaseModule } from "../modules/shared/database";
import { forecastModule } from "../modules/shared/forecast";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(
    /* Main */

    // Candlestick
    candlestickModule,

    // Forecast
    forecastModule,

    
    /* Shared */

    // Binance
    binanceModule,

    // Utilities
    utilitiesModule,

    // External Request
    externalRequestModule,

    // Database
    databaseModule,
);


// Export resolved container
export {appContainer};



