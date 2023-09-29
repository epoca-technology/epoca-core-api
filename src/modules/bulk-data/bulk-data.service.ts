import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IKeyZonesService, ILiquidityService, IMarketStateService } from "../market-state";
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
    @inject(SYMBOLS.LiquidityService)               private _liquidity: ILiquidityService;
    @inject(SYMBOLS.KeyZonesService)                private _kz: IKeyZonesService;
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
    public async getAppBulk(): Promise<IAppBulk> {
        return {
            serverTime: Date.now(),
            authorities: this._auth.authorities,
            guiVersion: typeof this._guiVersion.activeVersion == "string" ? this._guiVersion.activeVersion: await this._guiVersion.get(),
            positions: this._position.getActivePositionHeadlines(),
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
                positions: this._position.getActivePositionHeadlines(),
                marketState: <ICompressedMarketState>{
                    window: {
                        s: this._marketState.active.value.window.s,
                        ss: this._marketState.active.value.window.ss,
                        w: this._marketState.active.value.window.w.at(-1) || null
                    },
                    volume: this._marketState.active.value.volume,
                    liquidity: this._liquidity.getMinifiedState(true),
                    keyzones: this._marketState.active.value.keyzones,
                    coins: this._marketState.active.value.coins,
                    coinsBTC: this._marketState.active.value.coinsBTC,
                    reversal: this._marketState.active.value.reversal
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