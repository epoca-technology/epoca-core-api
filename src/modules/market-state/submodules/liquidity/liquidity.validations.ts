import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService, IValidationsService } from "../../../utilities";
import { ILiquidityConfiguration, ILiquidityValidations } from "./interfaces";




@injectable()
export class LiquidityValidations implements ILiquidityValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;




    constructor() {}








    /**
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     */
    public validateConfiguration(newConfiguration: ILiquidityConfiguration): void {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided liquidity config object is invalid.`, 26500));
        }
        if (!this._val.numberValid(newConfiguration.appbulk_stream_min_intensity, 1, 4)) {
            throw new Error(this._utils.buildApiError(`The provided appbulk_stream_min_intensity (${newConfiguration.appbulk_stream_min_intensity}) is invalid.`, 26504));
        }
        if (!this._val.numberValid(newConfiguration.max_peak_distance_from_price, 0.01, 5)) {
            throw new Error(this._utils.buildApiError(`The provided max_peak_distance_from_price (${newConfiguration.max_peak_distance_from_price}) is invalid.`, 26501));
        }
        if (
            !newConfiguration.intensity_weights || 
            typeof newConfiguration.intensity_weights != "object"
        ) {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided intensity_weights config object is invalid.`, 26502));
        }
        if (
            !this._val.numberValid(newConfiguration.intensity_weights[1], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[2], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[3], 1, 100) ||
            !this._val.numberValid(newConfiguration.intensity_weights[4], 1, 100)
        ) {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`One of the provided intensity weights is invalid.`, 26503));
        }
    }




}