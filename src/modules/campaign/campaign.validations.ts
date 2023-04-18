import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IAccountBalance, 
    ICampaignRecord, 
    ICampaignShareHolder, 
    ICampaignValidations 
} from "./interfaces";




@injectable()
export class CampaignValidations implements ICampaignValidations {
    // Inject dependencies
    @inject(SYMBOLS.ValidationsService)         private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;








    constructor() {}





    /***********************
     * Campaign Management *
     ***********************/







    /**
     * Checks if the system can build a campaign skeleton.
     * @param active 
     * @param balance 
     */
    public canCampaignSkeletonBeBuilt(active: ICampaignRecord|undefined, balance: IAccountBalance): void {
        // Make sure there isn't an active campaign
        if (active) {
            console.log(active);
            throw new Error(this._utils.buildApiError(`The campaign skeleton cannot be built because there is an active campaign.`, 39000));
        }

        // Validate the balance
        this.validateBalanceBasicProperties(balance);
    }







    /**
     * Checks if a new campaign can be created.
     * @param active 
     * @param balance 
     * @param newCampaign 
     */
    public canCampaignBeCreated(
        active: ICampaignRecord|undefined, 
        balance: IAccountBalance, 
        existingShareHolders: ICampaignShareHolder[],
        newCampaign: ICampaignRecord
    ): void {
        // Make sure there isn't an active campaign
        if (active) {
            console.log(active);
            throw new Error(this._utils.buildApiError(`The campaign cannot be created because there is an active campaign.`, 39003));
        }

        // Validate the balance
        this.validateBalanceBasicProperties(balance);

        // Ensure the new campaign is a properly formed object
        if (
            !newCampaign || typeof newCampaign != "object" ||
            !newCampaign.performance || typeof newCampaign.performance != "object" ||
            !newCampaign.shareholders || !Array.isArray(newCampaign.shareholders) ||
            !newCampaign.shareholders_data || typeof newCampaign.shareholders_data != "object"
        ) {
            console.log(newCampaign);
            throw new Error(this._utils.buildApiError(`The campaign object did not contain the required data.`, 39005));
        }

        // Validate the id
        if (!this._val.uuidValid(newCampaign.id)) {
            throw new Error(this._utils.buildApiError(`The provided campaign id is invalid.`, 39012));
        }

        // Validate the name & the description
        if (typeof newCampaign.name != "string" || newCampaign.name.length < 5 || newCampaign.name.length > 300) {
            throw new Error(this._utils.buildApiError(`The provided campaign name is invalid.`, 39007));
        }
        if (typeof newCampaign.description != "string" || newCampaign.description.length < 20 || newCampaign.description.length > 1000000) {
            throw new Error(this._utils.buildApiError(`The provided campaign description is invalid.`, 39008));
        }

        // Validate the date range
        if (!this._val.numberValid(newCampaign.start)) {
            throw new Error(this._utils.buildApiError(`The provided start date is invalid.`, 39009));
        }
        if (newCampaign.end != undefined) {
            throw new Error(this._utils.buildApiError(`The end of the campaign cannot exists as it has not even stated.`, 39010));
        }

        // Validate the max loss
        if (!this._val.numberValid(newCampaign.max_loss, -90, -5)) {
            throw new Error(this._utils.buildApiError(`The provided max loss is invalid.`, 39011));
        }

        // Validate the performance
        if (
            newCampaign.performance.initial_balance != balance.total ||
            newCampaign.performance.current_balance != balance.total ||
            newCampaign.performance.roi != 0 ||
            newCampaign.performance.pnl != 0 ||
            newCampaign.performance.epoca_profit != 0
        ) {
            console.log(newCampaign.performance);
            throw new Error(this._utils.buildApiError(`The provided performance object is invalid.`, 39006));
        }

        // Iterate over each shareholder and validate their properties
        for (let i = 0; i < existingShareHolders.length; i++) {
            // Ensure the list of shareholders is valid
            if (!newCampaign.shareholders[i] || newCampaign.shareholders[i].uid != existingShareHolders[i].uid) {
                console.log(existingShareHolders);
                console.log(newCampaign.shareholders);
                throw new Error(this._utils.buildApiError(`The shareholders list is invalid, the uid ${existingShareHolders[i].uid} was not provided.`, 39004));
            }

            // Validate the shareholder's data
            // @TODO
        }

    }









    /**
     * Performs a general validation on the balance to ensure the
     * campaigns can be interacted with.
     * @param balance 
     */
    public validateBalanceBasicProperties(balance: IAccountBalance): void {
        if (balance.total == 0) {
            console.log(balance);
            throw new Error(this._utils.buildApiError(`The campaign skeleton cannot be built because the account balance is 0.`, 39001));
        }
        if (balance.on_positions > 0) {
            throw new Error(this._utils.buildApiError(`The campaign skeleton cannot be built because there is balance on active positions.`, 39002));
        }
    }







}
