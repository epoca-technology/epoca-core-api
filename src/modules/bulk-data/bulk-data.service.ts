import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IEpochRecord, IEpochService } from "../epoch";
import { IPredictionService } from "../prediction";
import { IKeyZonesStateService, IMarketStateService } from "../market-state";
import { IGuiVersionService } from "../gui-version";
import { IServerService } from "../server";
import { IPositionService } from "../position";
import { IDatabaseService } from "../database";
import { 
    IAppBulk, 
    IAppBulkStream, 
    IBulkDataService, 
    ICompressedMarketState, 
    IServerDataBulk, 
    IServerResourcesBulk 
} from "./interfaces";
import { IAuthService } from "../auth";




@injectable()
export class BulkDataService implements IBulkDataService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                private _db: IDatabaseService;
    @inject(SYMBOLS.AuthService)                    private _auth: IAuthService;
    @inject(SYMBOLS.EpochService)                   private _epoch: IEpochService;
    @inject(SYMBOLS.PredictionService)              private _prediction: IPredictionService;
    @inject(SYMBOLS.KeyZonesStateService)           private _kz: IKeyZonesStateService;
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
    private readonly streamIntervalSeconds: number = 5;



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
            authorities: this._auth.authorities,
            guiVersion: typeof this._guiVersion.activeVersion == "string" ? this._guiVersion.activeVersion: await this._guiVersion.get(),
            epoch: epoch,
            positions: this._position.getActivePositionHeadlines(),
            prediction: this._prediction.active.value,
            marketState: this._marketState.active.value,
            apiErrors: this._apiError.count,
            keyzoneEventScoreRequirement: this._kz.config.eventScoreRequirement
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
            await this._db.appBulkRef.update(<IAppBulkStream> {
                prediction: this._prediction.active.value && typeof this._prediction.active.value == "object" ? this._prediction.active.value: null,
                positions: this._position.getActivePositionHeadlines(),
                marketState: <ICompressedMarketState>{
                    window: {
                        s: this._marketState.active.value.window.s,
                        ss: this._marketState.active.value.window.ss,
                        w: this._marketState.active.value.window.w.at(-1) || null
                    },
                    volume: this._marketState.active.value.volume,
                    keyzones: this._marketState.active.value.keyzones,
                    trend: {
                        s: this._marketState.active.value.trend.s,
                        ss: this._marketState.active.value.trend.ss,
                        w: this._marketState.active.value.trend.w.at(-1) || null
                    },
                    coins: this._marketState.active.value.coins
                },
                apiErrors: this._apiError.count
            });
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