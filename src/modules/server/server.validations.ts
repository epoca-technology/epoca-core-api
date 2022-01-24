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

        // Validate the max_file_system_usage
        if (!this._validations.numberValid(alarms.max_file_system_usage, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The max_file_system_usage must be a number ranging 30-99, instead received: ${alarms.max_file_system_usage}`, 6301));
        }

        // Validate the max_memory_usage
        if (!this._validations.numberValid(alarms.max_memory_usage, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The max_memory_usage must be a number ranging 30-99, instead received: ${alarms.max_memory_usage}`, 6302));
        }

        // Validate the max_cpu_load
        if (!this._validations.numberValid(alarms.max_cpu_load, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The max_cpu_load must be a number ranging 30-99, instead received: ${alarms.max_cpu_load}`, 6303));
        }

        // Validate the max_cpu_temperature
        if (!this._validations.numberValid(alarms.max_cpu_temperature, 50, 90)) {
            throw new Error(this._utils.buildApiError(`The max_cpu_temperature must be a number ranging 50-90, instead received: ${alarms.max_cpu_temperature}`, 6304));
        }

        // Validate the max_gpu_load
        if (!this._validations.numberValid(alarms.max_gpu_load, 30, 99)) {
            throw new Error(this._utils.buildApiError(`The max_gpu_load must be a number ranging 30-99, instead received: ${alarms.max_gpu_load}`, 6305));
        }

        // Validate the max_gpu_temperature
        if (!this._validations.numberValid(alarms.max_gpu_temperature, 50, 120)) {
            throw new Error(this._utils.buildApiError(`The max_gpu_temperature must be a number ranging 50-120, instead received: ${alarms.max_gpu_temperature}`, 6306));
        }

        // Validate the max_gpu_memory_temperature
        if (!this._validations.numberValid(alarms.max_gpu_memory_temperature, 50, 90)) {
            throw new Error(this._utils.buildApiError(`The max_gpu_memory_temperature must be a number ranging 50-90, instead received: ${alarms.max_gpu_memory_temperature}`, 6307));
        }
    }






}