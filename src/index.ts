// Core Dependencies
import "reflect-metadata";
import * as fs from "fs";
import express = require("express");
import bodyParser = require("body-parser");
import cors = require("cors");
import morgan = require("morgan");
import requestIp = require("request-ip");


// Environment
import { environment } from "./ioc";



// Init Express App
const app = express();




// Initialize the HTTP Logger
app.use(morgan("combined"));

// Morgan Issue: https://github.com/expressjs/morgan/issues/214
//app.set("trust proxy", true);


// Set the request ip middleware
app.use(requestIp.mw());


// Configure app to use bodyParser(), this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: "200kb" }));





// Set CORS
app.use(cors({}));





// Set Port
const port: number = Number(process.env.PORT) || 5075;







// Import Routes
import {ApiErrorRoute} from "./modules/api-error/api-error.route";
import {AuthRoute} from "./modules/auth/auth.route";
import {BulkDataRoute} from "./modules/bulk-data/bulk-data.route";
import {CandlestickRoute} from "./modules/candlestick/candlestick.route";
import {DatabaseRoute} from "./modules/database/database.route";
import {EpochRoute} from "./modules/epoch/epoch.route";
import {GuiVersionRoute} from "./modules/gui-version/gui-version.route";
import {IPBlacklistRoute} from "./modules/ip-blacklist/ip-blacklist.route";
import {MarketStateRoute} from "./modules/market-state/market-state.route";
import {PositionRoute} from "./modules/position/position.route";
import {PredictionRoute} from "./modules/prediction/prediction.route";
import {ServerRoute} from "./modules/server/server.route";

// Register Routes
app.use("/apiError", ApiErrorRoute);
app.use("/auth", AuthRoute);
app.use("/bulkData", BulkDataRoute);
app.use("/candlestick", CandlestickRoute);
app.use("/database", DatabaseRoute);
app.use("/epoch", EpochRoute);
app.use("/guiVersion", GuiVersionRoute);
app.use("/ipBlacklist", IPBlacklistRoute);
app.use("/marketState", MarketStateRoute);
app.use("/position", PositionRoute);
app.use("/prediction", PredictionRoute);
app.use("/server", ServerRoute);





// Enable Port Listener
app.listen(port);






// Send Welcome Message
app.get("/", (req: express.Request, res: express.Response) => { res.send("Welcome to Epoca :)") })






// In case of nasty errors
process.on("uncaughtException", (err) => logError(err, "uncaughtException"));
process.on("unhandledRejection", (err) => logError(err, "unhandledRejection"));
process.on("warning", (err) => logError(err, "warning"));
function logError(err: any, event: string): void {
    // console.log(event);
    console.error(err);
}






// Initialize API
import {init} from "./initializer";
const versionRaw: string = fs.readFileSync("package.json").toString();
const version: object = JSON.parse(versionRaw).version;
init()
.then(() => {
    console.log("Core API Initialized");
    console.log(`Running: v${version}`);
    console.log(`Port: ${port}`);
    console.log(`Production: ${environment.production}`);
    if (environment.testMode) console.log("Test Mode: true");
    if (environment.debugMode) console.log("Debug Mode: true");
    if (environment.restoreMode) console.log("Restore Mode: true");
})
.catch(e => { throw new Error("The API could not be initialized. Please restart it.") });