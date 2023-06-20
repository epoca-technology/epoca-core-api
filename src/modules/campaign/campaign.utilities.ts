import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IAuthService, IUser } from "../auth";
import { 
    ICoinsService,
    IKeyZonesStateService, 
    ILiquidityStateService, 
    IReversalService, 
    IWindowStateService 
} from "../market-state";
import { IPositionService } from "../position";
import { 
    ICampaignConfigurationsSnapshot,
    ICampaignRecord,
    ICampaignShareHolder,
    ICampaignUtilities, 
    IShareHolderData, 
    IShareHoldersData
} from "./interfaces";




@injectable()
export class CampaignUtilities implements ICampaignUtilities {
    // Inject dependencies
    @inject(SYMBOLS.AuthService)                private _auth: IAuthService;
    @inject(SYMBOLS.WindowStateService)         private _window: IWindowStateService;
    @inject(SYMBOLS.LiquidityService)           private _liquidity: ILiquidityStateService;
    @inject(SYMBOLS.KeyZonesStateService)       private _keyzones: IKeyZonesStateService;
    @inject(SYMBOLS.CoinsService)               private _coins: ICoinsService;
    @inject(SYMBOLS.ReversalService)            private _reversal: IReversalService;
    @inject(SYMBOLS.PositionService)            private _position: IPositionService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;








    constructor() {}







    /*****************************
     * Campaign Creation Helpers *
     *****************************/






    /**
     * Retrieves the list of Epoca Users and converts them into
     * ShareHolder Format.
     * @returns Promise<ICampaignShareHolder[]>
     */
    public async listShareHolders(): Promise<ICampaignShareHolder[]> {
        // Retrieve all the users
        const users: IUser[] = await this._auth.getAll();
        if (!users.length) {
            throw new Error(this._utils.buildApiError(`The list of shareholders could not be retrieved because there are no users.`, 38003));
        }

        // Finally, return the list
        return users.map((u) => { return { uid: u.uid, nickname: this.fromEmailToNickname(u.email) } });
    }
    private fromEmailToNickname(email: string): string {
        // Extract the raw nickname from the email
        const rawNickname: string = email.split("@")[0];

        // Init the size of the slice
        const sliceSize: number = rawNickname.length > 4 ? 2: 1;

        // Finally, put together the nickname
        return `${rawNickname.slice(0, 2)}...${rawNickname.slice(-sliceSize)}`;
    }







    /**
     * Builds the shareholders' data skeleton based on the
     * from the last campaign (if any).
     * @returns Promise<IShareHoldersData>
     */
    public buildShareHoldersDataSkeleton(
        shareholders: ICampaignShareHolder[], 
        lastCampaign: ICampaignRecord|undefined,
        totalBalance: number
    ): IShareHoldersData {
        // Initialize the data
        let data: IShareHoldersData = {};

        // Iterate over each shareholder
        for (let user of shareholders) {
            // Init values
            let prevBalance: number = 0;
            let prevProfitSplit: number = 70;
            if (lastCampaign && lastCampaign.shareholders_data[user.uid]) {
                prevBalance = lastCampaign.shareholders_data[user.uid].balance;
                prevProfitSplit = lastCampaign.shareholders_data[user.uid].profit_split;
            }

            // Insert the data into the skeleton object
            data[user.uid] = <IShareHolderData>{
                previous_balance: prevBalance,
                deposit: { amount: 0, description: "" },
                withdraw: { amount: 0, description: "" },
                original_balance: prevBalance,
                shares: this.calculateShares(totalBalance, prevBalance),
                profit_split: prevProfitSplit,
                roi: 0,
                pnl: 0,
                balance: prevBalance
            }
        }

        // Finally, return the build
        return data;
    }




    


    /**
     * Builds the configurations snapshot that will be stored when
     * a campaign is created.
     * @returns ICampaignConfigurationsSnapshot
     */
    public buildConfigurationsSnapshot(): ICampaignConfigurationsSnapshot {
        const { installed, supported, scores } = this._coins.getCoinsSummary();
        return {
            window: this._window.config,
            liquidity: this._liquidity.config,
            keyzones: this._keyzones.config,
            coins: this._coins.config,
            reversal: this._reversal.config,
            installed_coins: installed,
            strategy: this._position.strategy,
        }
    }



















    /************************
     * Campaign Calculators *
     ************************/






    /**
     * Calculates the number of shares a user has a given campaign.
     * @param campaignBudget 
     * @param shareholderBalance 
     * @returns number
     */
    public calculateShares(campaignBudget: number, shareholderBalance: number): number {
        return <number>this._utils.calculatePercentageOutOfTotal(shareholderBalance, campaignBudget);
    }







}
