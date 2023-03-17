import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IEpochRecord, IEpochService } from "../epoch";
import { IPredictionService } from "../prediction";
import { IMarketStateService, IWindowState } from "../market-state";
import { IGuiVersionService } from "../gui-version";
import { IServerService } from "../server";
import { IPositionService } from "../position";
import { IDatabaseService } from "../database";
import { 
    IAppBulk, 
    IAppBulkStream, 
    IBulkDataService, 
    ICompressedCandlesticks, 
    ICompressedMarketState, 
    ICompressedWindowState, 
    IServerDataBulk, 
    IServerResourcesBulk 
} from "./interfaces";




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
            guiVersion: typeof this._guiVersion.activeVersion == "string" ? this._guiVersion.activeVersion: await this._guiVersion.get(),
            epoch: epoch,
            position: this._position.active,
            prediction: this._prediction.active.value,
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
            await this._db.appBulkRef.update(<IAppBulkStream> {
                prediction: this._prediction.active.value && typeof this._prediction.active.value == "object" ? this._prediction.active.value: null,
                position: this._position.active,
                marketState: <ICompressedMarketState>{
                    window: this.compressWindowState(),
                    volume: this._marketState.active.value.volume,
                    liquidity: this._marketState.active.value.liquidity,
                    keyzones: this._marketState.active.value.keyzones,
                    trend: this._marketState.active.value.trend,
                    coins: this._marketState.active.value.coins
                },
                apiErrors: this._apiError.count
            });
        } catch (e) {
            console.error("Error when updating the app bulk stream: ", e);
        }
    }



    /**
     * Compresses the candlesticks within the current window state .
     * @returns ICompressedWindowState
     */
    private compressWindowState(): ICompressedWindowState {
        // Init the compressed candlesticks
        let compressed: ICompressedCandlesticks = {
            ot: [],
            ct: [],
            o: [],
            h: [],
            l: [],
            c: [],
        }

        // Grab a copy of the current window state
        let state: IWindowState|ICompressedWindowState|any = Object.assign({}, this._marketState.active.value.window);

        // Iterate over each candlestick in the window and build the object
        for (let candlestick of state.w) {
            compressed.ot.push(candlestick.ot);
            compressed.ct.push(candlestick.ct);
            compressed.o.push(candlestick.o);
            compressed.h.push(candlestick.h);
            compressed.l.push(candlestick.l);
            compressed.c.push(candlestick.c);
        }

        // Update the candlesticks
        state.w = compressed;

        // Finally, return the compressed object
        return state;
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