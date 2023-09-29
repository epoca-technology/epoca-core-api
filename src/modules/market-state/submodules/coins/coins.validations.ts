import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService, IValidationsService } from "../../../utilities";
import { 
    ICoinsConfiguration,
    ICoinsValidations
} from "./interfaces";




@injectable()
export class CoinsValidations implements ICoinsValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)         private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;





    constructor() {}







    /***********
     * General *
     ***********/





    /**
     * Validates a given symbol. If it is invalid, it throws
     * an error.
     * @param symbol 
     */
    public validateSymbol(symbol: string): void {
        if (typeof symbol !== "string" || symbol.length < 5 || symbol.slice(-4) != "USDT") {
            throw new Error(this._utils.buildApiError(`The provided symbol ${symbol} is invalid.`, 37000));
        }
    }













    /****************************
     * Configuration Management *
     ****************************/







    /**
     * Updates the Coins's Configuration on the db and the local property.
     * @param newConfiguration 
     */
    public validateConfiguration(newConfiguration: ICoinsConfiguration): void {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided coins config object is invalid.`, 37007));
        }
        if (!this._val.numberValid(newConfiguration.requirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided requirement (${newConfiguration.requirement}) is invalid.`, 37008));
        }
        if (!this._val.numberValid(newConfiguration.strongRequirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided strongRequirement (${newConfiguration.strongRequirement}) is invalid.`, 37009));
        }
        if (newConfiguration.requirement >= newConfiguration.strongRequirement) {
            throw new Error(this._utils.buildApiError(`The requirement cannot be greater than or equals to the 
            strongRequirement. Received: ${newConfiguration.requirement} | ${newConfiguration.strongRequirement}.`, 37010));
        }
        if (!this._val.numberValid(newConfiguration.supportedCoinsIntervalHours, 1, 48)) {
            throw new Error(this._utils.buildApiError(`The provided supportedCoinsIntervalHours (${newConfiguration.supportedCoinsIntervalHours}) is invalid.`, 37011));
        }
        if (!this._val.numberValid(newConfiguration.priceWindowSize, 32, 1024)) {
            throw new Error(this._utils.buildApiError(`The provided priceWindowSize (${newConfiguration.priceWindowSize}) is invalid.`, 37012));
        }
        if (!this._val.numberValid(newConfiguration.priceIntervalSeconds, 1, 128)) {
            throw new Error(this._utils.buildApiError(`The provided priceIntervalSeconds (${newConfiguration.priceIntervalSeconds}) is invalid.`, 37013));
        }
    }
}