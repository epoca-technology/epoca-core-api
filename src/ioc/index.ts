// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "../environment";

// Modules
import { forecastModule } from "../modules/shared/forecast";
import { binanceModule } from "../modules/shared/binance";
import { externalRequestModule } from "../modules/shared/external-request";
import { utilitiesModule } from "../modules/shared/utilities";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(

    // Forecast
    forecastModule,

    // Binance
    binanceModule,

    // External Request
    externalRequestModule,

    // Utilities
    utilitiesModule,
);



// Export resolved container
export {appContainer};