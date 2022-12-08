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
import { IDatabaseService } from "../database";




@injectable()
export class BulkDataService implements IBulkDataService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                private _db: IDatabaseService;
    @inject(SYMBOLS.EpochService)                   private _epoch: IEpochService;
    @inject(SYMBOLS.PredictionService)              private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)             private _marketState: IMarketStateService;
    @inject(SYMBOLS.GuiVersionService)              private _guiVersion: IGuiVersionService;
    @inject(SYMBOLS.ServerService)                  private _server: IServerService;
    @inject(SYMBOLS.PositionService)                private _position: IPositionService;
    @inject(SYMBOLS.ApiErrorService)                private _apiError: IApiErrorService;


    /**
     * App Bulk Stream Interval
     * Every intervalSeconds, the app bulk will be updated on the firebase rtdb.
     */
     private streamInterval: any;
     private readonly streamIntervalSeconds: number = 5; // ~5 seconds



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







    /* App Bulk Stream */




    /**
     * Syncs the app bulk and initializes the interval that will
     * keep it in sync.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        await this.updateStream();
        this.streamInterval = setInterval(async () => {
            await this.updateStream()
        }, this.streamIntervalSeconds * 1000);
    }




    /**
     * Stops the interval that keeps the app bulk in sync.
     */
    public stop(): void {
        if (this.streamInterval) clearInterval(this.streamInterval);
        this.streamInterval = undefined;
    }





    /**
     * Updates the app bulk if a safe manner.
     * @returns Promise<void>
     */
    private async updateStream(): Promise<void> {
        try {
            let appBulk: IAppBulk = await this.getAppBulk(this._epoch.active.value ? this._epoch.active.value.id:"undefined");
            appBulk.epoch = null;
            await this._db.appBulkRef.update(JSON.parse(JSON.stringify(appBulk)));
        } catch (e) {
            console.error("Error when updating the app bulk stream: ", e);
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