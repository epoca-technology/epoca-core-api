import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { IUtilitiesService, IValidationsService } from "../../../utilities";
import { IKeyZonesConfiguration, IKeyZonesValidations } from "./interfaces";




@injectable()
export class KeyZonesValidations implements IKeyZonesValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;





    constructor() {}









    /************************************
     * KeyZones Event Record Management *
     ************************************/




    /**
     * Verifies if the KeyZone Events can be listed for a given date range.
     * @param startAt 
     * @param endAt 
     */
    public canKeyZoneEventsBeListed(startAt: number, endAt: number): void {
        if (!this._val.numberValid(startAt)) {
            throw new Error(this._utils.buildApiError(`The provided startAt (${startAt}) is invalid.`, 27014));
        }
        if (!this._val.numberValid(endAt)) {
            throw new Error(this._utils.buildApiError(`The provided startAt (${endAt}) is invalid.`, 27015));
        }
        if (startAt >= endAt) {
            throw new Error(this._utils.buildApiError(`The beginning of the range must be less than the end.`, 27016));
        }
    }











    /*************************************
     * KeyZones Configuration Management *
     *************************************/





    /**
     * Validates all the properties in a given configuration.
     * @param config 
     */
    public validateConfiguration(config: IKeyZonesConfiguration): void {
        if (!config || typeof config != "object") {
            console.log(config);
            throw new Error(this._utils.buildApiError(`The provided keyzones config object is invalid.`, 27000));
        }
        if (!this._val.numberValid(config.buildFrequencyHours, 1, 24)) {
            throw new Error(this._utils.buildApiError(`The provided buildFrequencyHours (${config.buildFrequencyHours}) is invalid.`, 27001));
        }
        if (!this._val.numberValid(config.buildLookbackSize, 150, 150000)) {
            throw new Error(this._utils.buildApiError(`The provided buildLookbackSize (${config.buildLookbackSize}) is invalid.`, 27010));
        }
        if (!this._val.numberValid(config.zoneSize, 0.01, 10)) {
            throw new Error(this._utils.buildApiError(`The provided zoneSize (${config.zoneSize}) is invalid.`, 27002));
        }
        if (!this._val.numberValid(config.zoneMergeDistanceLimit, 0.01, 10)) {
            throw new Error(this._utils.buildApiError(`The provided zoneMergeDistanceLimit (${config.zoneMergeDistanceLimit}) is invalid.`, 27003));
        }
        if (!this._val.numberValid(config.stateLimit, 2, 20)) {
            throw new Error(this._utils.buildApiError(`The provided stateLimit (${config.stateLimit}) is invalid.`, 27004));
        }
        if (
            !config.scoreWeights || typeof config.scoreWeights != "object" ||
            !this._val.numberValid(config.scoreWeights.volume_intensity, 1, 10) ||
            !this._val.numberValid(config.scoreWeights.liquidity_share, 1, 10) ||
            config.scoreWeights.volume_intensity + config.scoreWeights.liquidity_share != 10
        ) {
            console.log(config.scoreWeights);
            throw new Error(this._utils.buildApiError(`The provided scoreWeights are invalid.`, 27005));
        }
        if (!this._val.numberValid(config.priceSnapshotsLimit, 3, 50)) {
            throw new Error(this._utils.buildApiError(`The provided priceSnapshotsLimit (${config.priceSnapshotsLimit}) is invalid.`, 27006));
        }
        if (!this._val.numberValid(config.supportEventDurationMinutes, 1, 1440)) {
            throw new Error(this._utils.buildApiError(`The provided supportEventDurationMinutes (${config.supportEventDurationMinutes}) is invalid.`, 27011));
        }
        if (!this._val.numberValid(config.resistanceEventDurationMinutes, 1, 1440)) {
            throw new Error(this._utils.buildApiError(`The provided resistanceEventDurationMinutes (${config.resistanceEventDurationMinutes}) is invalid.`, 27012));
        }
        if (!this._val.numberValid(config.eventPriceDistanceLimit, 0.1, 10)) {
            throw new Error(this._utils.buildApiError(`The provided eventPriceDistanceLimit (${config.eventPriceDistanceLimit}) is invalid.`, 27013));
        }
        if (!this._val.numberValid(config.keyzoneIdleOnEventMinutes, 1, 1440)) {
            throw new Error(this._utils.buildApiError(`The provided keyzoneIdleOnEventMinutes (${config.keyzoneIdleOnEventMinutes}) is invalid.`, 27008));
        }
        if (!this._val.numberValid(config.eventScoreRequirement, 1, 10)) {
            throw new Error(this._utils.buildApiError(`The provided eventScoreRequirement (${config.eventScoreRequirement}) is invalid.`, 27009));
        }
    }
}