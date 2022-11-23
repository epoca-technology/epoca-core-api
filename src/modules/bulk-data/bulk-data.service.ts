import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IEpochService } from "../epoch";
import { IPredictionService } from "../prediction";
import { IMarketStateService } from "../market-state";
import { IGuiVersionService } from "../gui-version";
import { IServerService } from "../server";
import { 
    IAppBulk, 
    IBulkDataService, 
    IServerDataBulk, 
    IServerResourcesBulk 
} from "./interfaces";




@injectable()
export class BulkDataService implements IBulkDataService {
    // Inject dependencies
    @inject(SYMBOLS.EpochService)                   private _epoch: IEpochService;
    @inject(SYMBOLS.PredictionService)              private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)             private _marketState: IMarketStateService;
    @inject(SYMBOLS.GuiVersionService)              private _guiVersion: IGuiVersionService;
    @inject(SYMBOLS.ServerService)                  private _server: IServerService;
    @inject(SYMBOLS.ApiErrorService)                private _apiError: IApiErrorService;


    constructor() {}





    /* App Bulk Retrievers */



    /**
     * Retrieves the Bulked Data required by the GUI to operate
     * and stay in sync with the server.
     * @returns IAppBulk
     */
    public async getAppBulk(): Promise<IAppBulk> {
        return {
            serverTime: Date.now(),
            guiVersion: typeof this._guiVersion.activeVersion == "string" ? this._guiVersion.activeVersion: await this._guiVersion.get(),
            epoch: this._epoch.active.value,
            positions: { long: undefined, short: undefined }, // @TODO
            prediction: this._prediction.active.value,
            predictionState: this._prediction.activeState,
            marketState: this._marketState.active.value
        }
    }









    /* Server Bulk Retrievers */





    /**
     * Retrieves the server data bulk.
     * @returns Promise<IServerDataBulk>
     */
    public async getServerDataBulk(): Promise<IServerDataBulk> {
        return {
            serverData: this._server.getServerData(),
            apiErrors: await this._apiError.getAll()
        }
    }





    /**
     * Retrieves the server resources bulk.
     * @returns Promise<IServerResourcesBulk>
     */
    public async getServerResourcesBulk(): Promise<IServerResourcesBulk> {
        return {
            serverResources: this._server.getServerResources(),
            apiErrors: await this._apiError.getAll()
        }
    }
}