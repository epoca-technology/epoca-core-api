// Core Dependencies
import "reflect-metadata";
import express = require("express");
import bodyParser = require("body-parser");
import cors = require("cors");
import morgan = require("morgan");


// Environment
import { environment } from "./ioc";



// Init Express App
const app = express();




// Initialize the HTTP Logger
app.use(morgan('combined'));

// Morgan Issue: https://github.com/expressjs/morgan/issues/214
app.set("trust proxy", true);





// Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());





// Set CORS
app.use(cors({}));





// Set Port
const port = process.env.PORT || 5075;








// Import Routes
import {AuthRoute} from './modules/auth/auth.route';
import {CandlestickRoute} from './modules/candlestick/candlestick.route';
import {ServerRoute} from './modules/server/server.route';
import {DatabaseRoute} from './modules/database/database.route';
import {GuiVersionRoute} from './modules/gui-version/gui-version.route';

// Register Routes
app.use('/auth', AuthRoute);
app.use('/candlestick', CandlestickRoute);
app.use('/server', ServerRoute);
app.use('/database', DatabaseRoute);
app.use('/guiVersion', GuiVersionRoute);





// Enable Port Listener
app.listen(port);






// Send Welcome Message
app.get('/', (req: express.Request, res: express.Response) => { res.send("Welcome to Plutus :)") })






// In case of nasty errors
process.on('uncaughtException', (err) => logError(err, 'uncaughtException'));
process.on('unhandledRejection', (err) => logError(err, 'unhandledRejection'));
process.on('warning', (err) => logError(err, 'warning'));
function logError(err: any, event: string): void {
    // console.log(event);
    console.error(err);
}






// Initialize API
import {init} from './initializer';
init()
.then(() => {
    console.log('Plutus API Initialized');
    console.log('Port: ' + port);
    console.log('Production: ' + environment.production);
    if (environment.testMode) console.log('Test Mode: true');
    if (environment.debugMode) console.log('Debug Mode: true');
})
.catch(e => {
	console.error(e);
	throw new Error('The API could not be initialized.');
});