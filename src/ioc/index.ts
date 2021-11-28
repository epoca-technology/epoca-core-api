// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "../environment";

// Modules
import { trendModule } from "../modules/shared/trend";
import { arimaModule } from "../modules/shared/arima";
import { utilitiesModule } from "../modules/shared/utilities";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(


    // Trend
    trendModule,

    // Arima
    arimaModule,

    // Utilities
    utilitiesModule,
);



// Export resolved container
export {appContainer};