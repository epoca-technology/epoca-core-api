// Core Dependencies
import "reflect-metadata";
import express = require("express");
import bodyParser = require("body-parser");
import cors = require("cors");
import {BigNumber} from "bignumber.js";
import morgan = require("morgan");
import rfs = require("rotating-file-stream");


// Environment
import { environment } from "./ioc";


// BigNumber Config
BigNumber.config({ ROUNDING_MODE: BigNumber.ROUND_DOWN, EXPONENTIAL_AT: 32 });


// Init Express App
const app = express();


// Initialize the HTTP Logger
const accessLogStream: morgan.StreamOptions = rfs.createStream('access.log', {
    path: './logs',
    maxFiles: 200,
    size: '500K',
});
app.use(morgan('combined', { stream: accessLogStream }));


// Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



// Set CORS
app.use(cors({}));


// Set Port
const port = process.env.PORT || 8075;








// Routes
import {CandlestickRoute} from './modules/candlestick/candlestick.route';
import {ServerRoute} from './modules/server/server.route';



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
    console.error(err);
}



// Initialize API
import {init} from './initializer';
init()
.then(() => {
    // Hello World
    console.log('Plutus API Initialized on Port: ' + port);
    console.log('Production: ' + environment.production);
})
.catch(e => {
	console.error(e);
	throw new Error('The API could not be initialized.');
});