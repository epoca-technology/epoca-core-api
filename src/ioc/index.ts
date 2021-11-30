// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "../environment";

// Modules
import { trendForecastModule } from "../modules/shared/trend-forecast";
import { arimaModule } from "../modules/shared/arima";
import { utilitiesModule } from "../modules/shared/utilities";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(


    // Trend Forecast
    trendForecastModule,

    // Arima
    arimaModule,

    // Utilities
    utilitiesModule,
);



// Export resolved container
export {appContainer};