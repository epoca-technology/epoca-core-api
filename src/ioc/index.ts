// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "../environment";

// Modules
import { trendModule } from "../modules/shared/trend";
import { arimaModule } from "../modules/shared/arima";
import { numberModule } from "../modules/shared/number";
import { errorModule } from "../modules/shared/error";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(


    // Trend
    trendModule,

    // Arima
    arimaModule,

    // Number
    numberModule,

    // Error
    errorModule,
);



// Export resolved container
export {appContainer};