import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IEpochRecord, IEpochService } from "../epoch";
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
import { IPositionService } from "../position";




@injectable()
export class BulkDataService implements IBulkDataService {
    // Inject dependencies
    @inject(SYMBOLS.EpochService)                   private _epoch: IEpochService;
    @inject(SYMBOLS.PredictionService)              private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)             private _marketState: IMarketStateService;
    @inject(SYMBOLS.GuiVersionService)              private _guiVersion: IGuiVersionService;
    @inject(SYMBOLS.ServerService)                  private _server: IServerService;
    @inject(SYMBOLS.PositionService)                private _position: IPositionService;
    @inject(SYMBOLS.ApiErrorService)                private _apiError: IApiErrorService;


    constructor() {}





    /* App Bulk Retrievers */



    /**
     * Retrieves the Bulked Data required by the GUI to operate
     * and stay in sync with the server.
     * @returns IAppBulk
     */
    public async getAppBulk(epochID: string): Promise<IAppBulk> {
        // Build the epoch that will be included in the bulk
        let epoch: IEpochRecord|undefined|"keep" = undefined;
        if (this._epoch.active.value) {
            epoch = this._epoch.active.value.id == epochID ? "keep": this._epoch.active.value;
        }

        // Finally, return the bulk
        return {
            serverTime: Date.now(),
            guiVersion: typeof this._guiVersion.activeVersion == "string" ? this._guiVersion.activeVersion: await this._guiVersion.get(),
            epoch: epoch,
            position: this._position.getSummary(),
            prediction: this._prediction.active.value,
            predictionState: this._prediction.activeState,
            marketState: this._marketState.active.value,
            apiErrors: this._apiError.count
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