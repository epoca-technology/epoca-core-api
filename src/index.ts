// Core Dependencies
import "reflect-metadata";
import express = require("express");
import bodyParser = require('body-parser');
import cors = require('cors');
import {BigNumber} from 'bignumber.js';

// Environment
import { environment } from "./ioc";


// BigNumber Config
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN, EXPONENTIAL_AT: 32 });


// Init Express App
const app = express();


// Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



// Set CORS
app.use(cors({}));


// Set Port
const port = process.env.PORT || 8075;








// Routes
import {ForecastRoute} from './modules/forecast/forecast.route';
import {CandlestickRoute} from './modules/candlestick/candlestick.route';
import {ServerRoute} from './modules/server/server.route';


app.use('/forecast', ForecastRoute);
app.use('/candlestick', CandlestickRoute);
app.use('/server', ServerRoute);





// Enable Port Listener
app.listen(port);




// Send Welcome Message
app.get('/', (req: express.Request, res: express.Response) => {
  res.send("Welcome to Plutus :)");
})




// In case of nasty errors
process.on('uncaughtException', (err) => logError(err, 'uncaughtException'));
process.on('unhandledRejection', (err) => logError(err, 'unhandledRejection'));
process.on('warning', (err) => logError(err, 'warning'));
function logError(err: any, event: string): void {
    // console.log(event);
    console.log(err);
}



// Initialize API
import {init} from './initializer';
init();



// Hello World
console.log('Plutus API Initialized on Port: ' + port);
console.log('Production: ' + environment.production);