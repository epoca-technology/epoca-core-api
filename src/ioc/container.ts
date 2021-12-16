// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "./environment";

// Modules
import { forecastModule } from "../modules/shared/forecast";
import { candlestickModule } from "../modules/shared/candlestick";
import { binanceModule } from "../modules/shared/binance";
import { cryptocurrencyModule } from "../modules/shared/cryptocurrency";
import { utilitiesModule } from "../modules/shared/utilities";
import { externalRequestModule } from "../modules/shared/external-request";
import { databaseModule } from "../modules/shared/database";



// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(

    // Forecast
    forecastModule,

    // Candlestick
    candlestickModule,

    // Binance
    binanceModule,

    // CryptoCurrency
    cryptocurrencyModule,

    // Utilities
    utilitiesModule,

    // External Request
    externalRequestModule,

    // Database
    databaseModule,
);


// Export resolved container
export {appContainer};



