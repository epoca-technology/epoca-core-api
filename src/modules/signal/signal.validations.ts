import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IBinancePositionSide } from "../binance";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    ILongShortRatioCancellation,
    ILongShortRatioIssuance,
    IOpenInterestCancellation,
    IOpenInterestIssuance,
    IOpenInterestLongShortRatioCancellation,
    IOpenInterestLongShortRatioIssuance,
    ISignalSidePolicies,
    ISignalValidations,
    ITechnicalsCancellation,
    ITechnicalsIssuance,
    ITechnicalsLongShortRatioCancellation,
    ITechnicalsLongShortRatioIssuance,
    ITechnicalsOpenInterestCancellation,
    ITechnicalsOpenInterestIssuance,
    IVolumeCancellation,
    IVolumeIssuance,
    IVolumeLongShortRatioCancellation,
    IVolumeLongShortRatioIssuance,
    IVolumeOpenInterestCancellation,
    IVolumeOpenInterestIssuance,
    IVolumeTechnicalsCancellation,
    IVolumeTechnicalsIssuance,
    IWindowCancellation,
} from "./interfaces";


@injectable()
export class SignalValidations implements ISignalValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)          private _v: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)            private _utils: IUtilitiesService;



    constructor() {}

















    /**
     * Verifies if the given new policies are valid for the side.
     * @param side 
     * @param newPolicies 
     */
    public canSidePoliciesBeUpdated(side: IBinancePositionSide, newPolicies: ISignalSidePolicies): void {
        // Validate the side
        this.validateSide(side);

        // Ensure the new policies is a valid object
        if (
            !newPolicies || typeof newPolicies != "object" ||
            !newPolicies.issuance || typeof newPolicies.issuance != "object" ||
            !newPolicies.issuance.volume || typeof newPolicies.issuance.volume != "object" ||
            !newPolicies.issuance.technicals || typeof newPolicies.issuance.technicals != "object" ||
            !newPolicies.issuance.open_interest || typeof newPolicies.issuance.open_interest != "object" ||
            !newPolicies.issuance.long_short_ratio || typeof newPolicies.issuance.long_short_ratio != "object" ||
            !newPolicies.issuance.volume_technicals || typeof newPolicies.issuance.volume_technicals != "object" ||
            !newPolicies.issuance.volume_open_interest || typeof newPolicies.issuance.volume_open_interest != "object" ||
            !newPolicies.issuance.volume_long_short_ratio || typeof newPolicies.issuance.volume_long_short_ratio != "object" ||
            !newPolicies.issuance.technicals_open_interest || typeof newPolicies.issuance.technicals_open_interest != "object" ||
            !newPolicies.issuance.technicals_long_short_ratio || typeof newPolicies.issuance.technicals_long_short_ratio != "object" ||
            !newPolicies.issuance.open_interest_long_short_ratio || typeof newPolicies.issuance.open_interest_long_short_ratio != "object" ||
            !newPolicies.cancellation || typeof newPolicies.cancellation != "object" ||
            !newPolicies.cancellation.window || typeof newPolicies.cancellation.window != "object" ||
            !newPolicies.cancellation.volume || typeof newPolicies.cancellation.volume != "object" ||
            !newPolicies.cancellation.technicals || typeof newPolicies.cancellation.technicals != "object" ||
            !newPolicies.cancellation.open_interest || typeof newPolicies.cancellation.open_interest != "object" ||
            !newPolicies.cancellation.long_short_ratio || typeof newPolicies.cancellation.long_short_ratio != "object" ||
            !newPolicies.cancellation.volume_technicals || typeof newPolicies.cancellation.volume_technicals != "object" ||
            !newPolicies.cancellation.volume_open_interest || typeof newPolicies.cancellation.volume_open_interest != "object" ||
            !newPolicies.cancellation.volume_long_short_ratio || typeof newPolicies.cancellation.volume_long_short_ratio != "object" ||
            !newPolicies.cancellation.technicals_open_interest || typeof newPolicies.cancellation.technicals_open_interest != "object" ||
            !newPolicies.cancellation.technicals_long_short_ratio || typeof newPolicies.cancellation.technicals_long_short_ratio != "object" ||
            !newPolicies.cancellation.open_interest_long_short_ratio || typeof newPolicies.cancellation.open_interest_long_short_ratio != "object"
        ) {
            console.log(newPolicies);
            throw new Error(this._utils.buildApiError(`The provided new signal policies for ${side} are invalid.`, 36001));
        }

        // Validate the issuance policies
        this.validateVolumeIssuance(side, newPolicies.issuance.volume);
        this.validateTechnicalsIssuance(side, newPolicies.issuance.technicals);
        this.validateOpenInterestIssuance(side, newPolicies.issuance.open_interest);
        this.validateLongShortRatioIssuance(side, newPolicies.issuance.long_short_ratio);
        this.validateVolumeTechnicalsIssuance(side, newPolicies.issuance.volume_technicals);
        this.validateVolumeOpenInterestIssuance(side, newPolicies.issuance.volume_open_interest);
        this.validateVolumeLongShortRatioIssuance(side, newPolicies.issuance.volume_long_short_ratio);
        this.validateTechnicalsOpenInterestIssuance(side, newPolicies.issuance.technicals_open_interest);
        this.validateTechnicalsLongShortRatioIssuance(side, newPolicies.issuance.technicals_long_short_ratio);
        this.validateOpenInterestLongShortRatioIssuance(side, newPolicies.issuance.open_interest_long_short_ratio);

        // Validate the cancellation policies
        this.validateWindowCancellation(side, newPolicies.cancellation.window);
        this.validateVolumeCancellation(side, newPolicies.cancellation.volume);
        this.validateTechnicalsCancellation(side, newPolicies.cancellation.technicals);
        this.validateOpenInterestCancellation(side, newPolicies.cancellation.open_interest);
        this.validateLongShortRatioCancellation(side, newPolicies.cancellation.long_short_ratio);
        this.validateVolumeTechnicalsCancellation(side, newPolicies.cancellation.volume_technicals);
        this.validateVolumeOpenInterestCancellation(side, newPolicies.cancellation.volume_open_interest);
        this.validateVolumeLongShortRatioCancellation(side, newPolicies.cancellation.volume_long_short_ratio);
        this.validateTechnicalsOpenInterestCancellation(side, newPolicies.cancellation.technicals_open_interest);
        this.validateTechnicalsLongShortRatioCancellation(side, newPolicies.cancellation.technicals_long_short_ratio);
        this.validateOpenInterestLongShortRatioCancellation(side, newPolicies.cancellation.open_interest_long_short_ratio);
    }










    /*******************************
     * Issuance Policy Validations *
     *******************************/




    /**
     * Validates the volume issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeIssuance(side: IBinancePositionSide, policy: IVolumeIssuance): void {
        // Init the origin
        const origin: string = "VolumeIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.volume != 2) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume_direction, origin, 36016);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.volume != 2) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume_direction, origin, 36016);
        }
    }




    /**
     * Validates the technical analysis issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsIssuance(side: IBinancePositionSide, policy: ITechnicalsIssuance): void {
        // Init the origin
        const origin: string = "TechnicalsIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }





    /**
     * Validates the open interest issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateOpenInterestIssuance(side: IBinancePositionSide, policy: IOpenInterestIssuance): void {
        // Init the origin
        const origin: string = "OpenInterestIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.open_interest != 2) this.error("open_interest", policy.open_interest, origin, 36012);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.open_interest != -2) this.error("open_interest", policy.open_interest, origin, 36012);
        }
    }




    
    /**
     * Validates the long/short ratio issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateLongShortRatioIssuance(side: IBinancePositionSide, policy: ILongShortRatioIssuance): void {
        // Init the origin
        const origin: string = "LongShortRatioIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.long_short_ratio != 2) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (policy.long_short_ratio != -2) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }
    }




    /**
     * Validates the volume technicals issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeTechnicalsIssuance(side: IBinancePositionSide, policy: IVolumeTechnicalsIssuance): void {
        // Init the origin
        const origin: string = "VolumeTechnicalsIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume_direction, origin, 36016);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume_direction, origin, 36016);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }





    /**
     * Validates the volume open interest issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeOpenInterestIssuance(side: IBinancePositionSide, policy: IVolumeOpenInterestIssuance): void {
        // Init the origin
        const origin: string = "VolumeOpenInterestIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume_direction, origin, 36016);
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume_direction, origin, 36016);
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
        }
    }







    /**
     * Validates the volume long/short ratio issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeLongShortRatioIssuance(side: IBinancePositionSide, policy: IVolumeLongShortRatioIssuance): void {
        // Init the origin
        const origin: string = "VolumeLongShortRatioIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume_direction, origin, 36016);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume_direction, origin, 36016);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }
    }




    /**
     * Validates the technicals open interest issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsOpenInterestIssuance(side: IBinancePositionSide, policy: ITechnicalsOpenInterestIssuance): void {
        // Init the origin
        const origin: string = "TechnicalsOpenInterestIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }




    /**
     * Validates the technicals long/short ratio issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsLongShortRatioIssuance(side: IBinancePositionSide, policy: ITechnicalsLongShortRatioIssuance): void {
        // Init the origin
        const origin: string = "TechnicalsLongShortRatioIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }







    /**
     * Validates the open interest long/short ratio issuance policies for a side.
     * @param side 
     * @param policy 
     */
    private validateOpenInterestLongShortRatioIssuance(side: IBinancePositionSide, policy: IOpenInterestLongShortRatioIssuance): void {
        // Init the origin
        const origin: string = "OpenInterestLongShortRatioIssuance";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.trend_sum, 0, 1)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, 0, 9)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, 0, 2)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.trend_sum, -1, 0)) this.error("trend_sum", policy.trend_sum, origin, 36003);
            if (!this._v.numberValid(policy.trend_state, -9, 0)) this.error("trend_state", policy.trend_state, origin, 36004);
            if (!this._v.numberValid(policy.trend_intensity, -2, 0)) this.error("trend_intensity", policy.trend_intensity, origin, 36005);
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }
    }










    /***********************************
     * Cancellation Policy Validations *
     ***********************************/





    /**
     * Validates the window cancellation policy for a side.
     * @param side 
     * @param policy 
     */
    private validateWindowCancellation(side: IBinancePositionSide, policy: IWindowCancellation): void {
        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, "WindowCancellation", 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.window, 1, 2)) this.error("window", policy.window, "WindowCancellation", 36014);
        } else {
            if (!this._v.numberValid(policy.window, -2, -1)) this.error("window", policy.window, "WindowCancellation", 36014);
        }
    }






    /**
     * Validates the volume cancellation policy for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeCancellation(side: IBinancePositionSide, policy: IVolumeCancellation): void {
        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, "VolumeCancellation", 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, "VolumeCancellation", 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume, "VolumeCancellation", 36016);
        } else {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, "VolumeCancellation", 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume, "VolumeCancellation", 36016);
        }
    }




    /**
     * Validates the technical analysis cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsCancellation(side: IBinancePositionSide, policy: ITechnicalsCancellation): void {
        // Init the origin
        const origin: string = "TechnicalsCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        } else {
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }





    /**
     * Validates the open interest cancellation policy for a side.
     * @param side 
     * @param policy 
     */
    private validateOpenInterestCancellation(side: IBinancePositionSide, policy: IOpenInterestCancellation): void {
        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, "OpenInterestCancellation", 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (policy.open_interest != -2) this.error("open_interest", policy.open_interest, "OpenInterestCancellation", 36012);
        } else {
            if (policy.open_interest != 2) this.error("open_interest", policy.open_interest, "OpenInterestCancellation", 36012);
        }
    }




    /**
     * Validates the long/short ratio cancellation policy for a side.
     * @param side 
     * @param policy 
     */
    private validateLongShortRatioCancellation(side: IBinancePositionSide, policy: ILongShortRatioCancellation): void {
        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, "LongShortRatioCancellation", 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (policy.long_short_ratio != -2) this.error("long_short_ratio", policy.long_short_ratio, "LongShortRatioCancellation", 36013);
        } else {
            if (policy.long_short_ratio != 2) this.error("long_short_ratio", policy.long_short_ratio, "LongShortRatioCancellation", 36013);
        }
    }





    /**
     * Validates the volume technicals cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeTechnicalsCancellation(side: IBinancePositionSide, policy: IVolumeTechnicalsCancellation): void {
        // Init the origin
        const origin: string = "VolumeTechnicalsCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        } else {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }




    /**
     * Validates the volume open interest cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeOpenInterestCancellation(side: IBinancePositionSide, policy: IVolumeOpenInterestCancellation): void {
        // Init the origin
        const origin: string = "VolumeOpenInterestCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
        } else {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
        }
    }




    /**
     * Validates the volume long/short ratio cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateVolumeLongShortRatioCancellation(side: IBinancePositionSide, policy: IVolumeLongShortRatioCancellation): void {
        // Init the origin
        const origin: string = "VolumeLongShortRatioCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != -2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.volume, 1, 2)) this.error("volume", policy.volume, origin, 36015);
            if (policy.volume_direction != 2) this.error("volume_direction", policy.volume, origin, 36016);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }
    }







    /**
     * Validates the technicals open interest cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsOpenInterestCancellation(side: IBinancePositionSide, policy: ITechnicalsOpenInterestCancellation): void {
        // Init the origin
        const origin: string = "TechnicalsOpenInterestCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
        } else {
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }








    /**
     * Validates the technicals long/short ratio cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateTechnicalsLongShortRatioCancellation(side: IBinancePositionSide, policy: ITechnicalsLongShortRatioCancellation): void {
        // Init the origin
        const origin: string = "TechnicalsLongShortRatioCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.ta_15m, -2, 0)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, -2, 0)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, -2, 0)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, -2, 0)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, -2, 0)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, -2, 0)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.ta_15m, 0, 2)) this.error("ta_15m", policy.ta_15m, origin, 36017);
            if (!this._v.numberValid(policy.ta_30m, 0, 2)) this.error("ta_30m", policy.ta_30m, origin, 36006);
            if (!this._v.numberValid(policy.ta_1h, 0, 2)) this.error("ta_1h", policy.ta_1h, origin, 36007);
            if (!this._v.numberValid(policy.ta_2h, 0, 2)) this.error("ta_2h", policy.ta_2h, origin, 36008);
            if (!this._v.numberValid(policy.ta_4h, 0, 2)) this.error("ta_4h", policy.ta_4h, origin, 36009);
            if (!this._v.numberValid(policy.ta_1d, 0, 2)) this.error("ta_1d", policy.ta_1d, origin, 36010);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }

        // Validate the technicals
        this.technicalsValid(policy, origin);
    }







    /**
     * Validates the open interest long/short ratio cancellation policies for a side.
     * @param side 
     * @param policy 
     */
    private validateOpenInterestLongShortRatioCancellation(side: IBinancePositionSide, policy: IOpenInterestLongShortRatioCancellation): void {
        // Init the origin
        const origin: string = "OpenInterestLongShortRatioCancellation";

        // Validate the status
        if (typeof policy.enabled != "boolean") { this.error("enabled", policy.enabled, origin, 36002) }

        // Validate the rest according to the side
        if (side == "LONG") {
            if (!this._v.numberValid(policy.open_interest, -2, -1)) this.error("open_interest", policy.open_interest, origin, 36012);
            if (!this._v.numberValid(policy.long_short_ratio, -2, -1)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        } else {
            if (!this._v.numberValid(policy.open_interest, 1, 2)) this.error("open_interest", policy.open_interest, origin, 36012);
            if (!this._v.numberValid(policy.long_short_ratio, 1, 2)) this.error("long_short_ratio", policy.long_short_ratio, origin, 36013);
        }
    }
















    /****************
     * Misc Helpers *
     ****************/




    /**
     * Ensures that at least 1 ta policy different to 0 has been provided.
     * @param policy 
     * @param origin 
     */
    private technicalsValid(
        policy: ITechnicalsIssuance|ITechnicalsOpenInterestIssuance|ITechnicalsLongShortRatioIssuance|ITechnicalsCancellation|
        ITechnicalsOpenInterestCancellation|ITechnicalsLongShortRatioCancellation, 
        origin: string
    ): void {
        if (policy.ta_15m == 0 && policy.ta_30m == 0 && policy.ta_1h == 0 && policy.ta_2h == 0 && policy.ta_4h == 0 && policy.ta_1d == 0) {
            throw new Error(this._utils.buildApiError(`At least 1 of the technical analysis properties must be different to 0 in the ${origin} Policy.`, 36011));
        }
    }




    /**
     * Ensures the provided side is valid.
     * @param side 
     */
    public validateSide(side: IBinancePositionSide): void {
        if (side != "LONG" && side != "SHORT") {
            throw new Error(this._utils.buildApiError(`The provided side is invalid. Received: ${side}`, 36000));
        }
    }




    /**
     * Throws an error based on the provided values.
     * @param propertyName 
     * @param propertyValue 
     * @param origin 
     * @param errorCode 
     */
    private error(
        propertyName: string, 
        propertyValue: any,
        origin: string, 
        errorCode: number
    ): void {
        throw new Error(
            this._utils.buildApiError(
                `The provided ${propertyName} property in the ${origin} Policy is invalid. Received: ${propertyValue}`, 
                errorCode
            )
        );
    }
}


