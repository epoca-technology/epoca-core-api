import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService, IValidationsService } from "../../../utilities";
import { IWindowStateConfiguration, IWindowValidations } from "./interfaces";




@injectable()
export class WindowValidations implements IWindowValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;





    constructor() { }





    /**
     * Validates the window's configuration prior to being updated.
     * @param newConfiguration 
     */
    public validateConfiguration(newConfiguration: IWindowStateConfiguration): void {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided window config object is invalid.`, 25000));
        }
        if (!this._val.numberValid(newConfiguration.requirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided requirement (${newConfiguration.requirement}) is invalid.`, 25001));
        }
        if (!this._val.numberValid(newConfiguration.strongRequirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided strongRequirement (${newConfiguration.strongRequirement}) is invalid.`, 25002));
        }
        if (newConfiguration.requirement >= newConfiguration.strongRequirement) {
            throw new Error(this._utils.buildApiError(`The requirement cannot be greater than or equals to the 
            strongRequirement. Received: ${newConfiguration.requirement} | ${newConfiguration.strongRequirement}.`, 25003));
        }
    }
}