import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { 
    IAccountBalance, 
    ICampaignModel, 
    ICampaignRecord, 
    ICampaignShareHolder, 
    ICampaignValidations 
} from "./interfaces";




@injectable()
export class CampaignValidations implements ICampaignValidations {
    // Inject dependencies
    @inject(SYMBOLS.CampaignModel)              private _model: ICampaignModel;
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

        // Ensure there are no active positions
        if (balance.on_positions > 0) {
            throw new Error(this._utils.buildApiError(`The campaign skeleton cannot be built because there is an active position.`, 39013));
        }
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
        lastCampaign: ICampaignRecord|undefined,
        newCampaign: ICampaignRecord,
    ): void {
        // Make sure there isn't an active campaign
        if (active) {
            console.log(active);
            throw new Error(this._utils.buildApiError(`The campaign cannot be created because there is an active campaign.`, 39003));
        }

        // Validate the balance
        this.validateBalanceBasicProperties(balance);

        // Ensure there are no active positions
        if (balance.on_positions > 0) {
            throw new Error(this._utils.buildApiError(`The campaign skeleton cannot be built because there is an active position.`, 39013));
        }

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

        // Validate the trading_disabled
        if (newCampaign.trading_disabled !== false) {
            throw new Error(this._utils.buildApiError(`The provided trading_disabled is invalid.`, 39014));
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

        // Ensure there are at least $10 in the account
        if (newCampaign.performance.initial_balance < 0) {
            throw new Error(this._utils.buildApiError(`The campaign cannot be created because there are less than 10 USDT in the account.`, 39015));
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









    /*****************************
     * Campaign Notes Management *
     *****************************/




    /**
     * Verifies if a given note can be stored in the db.
     * @param campaignID 
     * @param title 
     * @param description 
     * @returns Promise<void>
     */
    public async canNoteBeSaved(campaignID: string, title: string, description: string): Promise<void> {
        // Validate the id
        if (!this._val.uuidValid(campaignID)) {
            throw new Error(this._utils.buildApiError(`The provided campaign id is invalid.`, 39016));
        }

        // Validate the name & the description
        if (typeof title != "string" || title.length < 5 || title.length > 300) {
            throw new Error(this._utils.buildApiError(`The provided note title is invalid.`, 39017));
        }
        if (typeof description != "string" || description.length < 20 || description.length > 1000000) {
            throw new Error(this._utils.buildApiError(`The provided note description is invalid.`, 39018));
        }

        // Ensure the campaign record exists
        const record: ICampaignRecord = await this._model.getCampaignRecord(campaignID);
    }






    /**
     * Verifies if the notes for a campaign can be listed.
     * @param campaignID 
     */
    public canNotesBeListed(campaignID: string): void {
        // Validate the id
        if (!this._val.uuidValid(campaignID)) {
            throw new Error(this._utils.buildApiError(`The provided campaign id is invalid.`, 39016));
        }
    }










    /**********************
     * General Retrievers *
     **********************/



    /**
     * Verifies if the campaign summary can be retrieved for
     * a campaign.
     * @param campaignID 
     * @returns Promise<void>
     */
    public async canCampaignSummaryBeRetrieved(campaignID: string): Promise<void> {
        // Validate the id
        if (!this._val.uuidValid(campaignID)) {
            throw new Error(this._utils.buildApiError(`The provided campaign id is invalid.`, 39016));
        }
    }







    /**
     * Verifies if the configurations snapshot can be retrieved for
     * a campaign.
     * @param campaignID 
     * @returns Promise<void>
     */
    public async canConfigurationsSnapshotBeRetrieved(campaignID: string): Promise<void> {
        // Validate the id
        if (!this._val.uuidValid(campaignID)) {
            throw new Error(this._utils.buildApiError(`The provided campaign id is invalid.`, 39016));
        }

        // Ensure the campaign record exists
        const record: ICampaignRecord = await this._model.getCampaignRecord(campaignID);
    }












    /**
     * Ensures a given date range is valid for db queries.
     * @param startAt 
     * @param endAt 
     */
    public validateDateRange(startAt: number, endAt: number): void {
        if (typeof startAt != "number" || typeof endAt != "number") {
            throw new Error(this._utils.buildApiError(`The provided date range is invalid.`, 39019));
        }
        if (endAt <= startAt) {
            throw new Error(this._utils.buildApiError(`The end of the query must be greater than the beginning.`, 39020));
        }
    }
}
