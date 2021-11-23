// Core Dependencies
//import "reflect-metadata";
import express = require("express");
import bodyParser = require('body-parser');
import cors = require('cors');


// Environment
// @TODO


// Init Express App
const app = express()


// Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());



// Set CORS
app.use(cors({}));


// Set Port
const port = process.env.PORT || 8075;








// Routes
import {TestRoutes} from './components/test/test.route';


app.use('/test', TestRoutes);





// Enable Port Listener
app.listen(port);




// Send Welcome Message
app.get('/', (req, res) => {
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




// Hello World
console.log('Plutus API Initialized on Port: ' + port);
console.log('Production: ' + false);