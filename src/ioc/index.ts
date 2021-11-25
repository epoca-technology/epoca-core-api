// Core Dependencies
import {Container} from "inversify";

// Environment 
import { environment } from "../environment";

// Modules
import { arimaModule } from "../modules/shared/arima";
import { errorModule } from "../modules/shared/error";


// Initialize Inversify
const appContainer: Container = new Container({skipBaseClassChecks: true, defaultScope: "Singleton"});




// Load the container
appContainer.load(

    // Arima
    arimaModule,

    // Error
    errorModule,
);



// Export resolved container
export {appContainer};