import {inject, injectable} from "inversify";
import { IServerValidations, IAlarmsConfig } from "./interfaces";
import { SYMBOLS } from "../../ioc";
import { IValidationsService } from "../shared/validations";
import { IUtilitiesService } from "../shared/utilities";


@injectable()
export class ServerValidations implements IServerValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                 private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    constructor() {}


    




    /**
     * Verifies that the provided alarm values are correct and can be set.
     * @param alarms 
     * @returns void
     */
    public canSetAlarmsConfiguration(alarms: IAlarmsConfig): void {
        // Must be a valid object
        if (!alarms || typeof alarms != "object") {
            throw new Error(this._utils.buildApiError(`The alarms configuration must be a valid object.`, 6300));
        }

        // Validate the maxFileSystemUsage
        if (!this._validations.numberValid(alarms.maxFileSystemUsage, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The maxFileSystemUsage must be a number ranging 30-99, instead received: ${alarms.maxFileSystemUsage}`, 6301));
        }

        // Validate the maxMemoryUsage
        if (!this._validations.numberValid(alarms.maxMemoryUsage, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The maxMemoryUsage must be a number ranging 30-99, instead received: ${alarms.maxMemoryUsage}`, 6302));
        }

        // Validate the maxCPULoad
        if (!this._validations.numberValid(alarms.maxCPULoad, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The maxCPULoad must be a number ranging 30-99, instead received: ${alarms.maxCPULoad}`, 6303));
        }

        // Validate the maxCPUTemperature
        if (!this._validations.numberValid(alarms.maxCPUTemperature, 50, 90)) {
            throw new Error(this._utils.buildApiError(`The maxCPUTemperature must be a number ranging 50-90, instead received: ${alarms.maxCPUTemperature}`, 6304));
        }

        // Validate the maxGPULoad
        if (!this._validations.numberValid(alarms.maxGPULoad, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The maxGPULoad must be a number ranging 30-99, instead received: ${alarms.maxGPULoad}`, 6305));
        }

        // Validate the maxGPUTemperature
        if (!this._validations.numberValid(alarms.maxGPUTemperature, 50, 120)) {
            throw new Error(this._utils.buildApiError(`The maxGPUTemperature must be a number ranging 50-120, instead received: ${alarms.maxGPUTemperature}`, 6306));
        }

        // Validate the maxGPUMemoryTemperature
        if (!this._validations.numberValid(alarms.maxGPUMemoryTemperature, 50, 90)) {
            throw new Error(this._utils.buildApiError(`The maxGPUMemoryTemperature must be a number ranging 50-90, instead received: ${alarms.maxGPUMemoryTemperature}`, 6307));
        }
    }






}