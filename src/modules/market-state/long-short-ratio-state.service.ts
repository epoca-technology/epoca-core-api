import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceLongShortRatio, IBinanceLongShortRatioKind, IBinanceService } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    IExchangeLongShortRatioID,
    IExchangeLongShortRatioState,
    ILongShortRatioState,
    ILongShortRatioStateService,
    ISplitStateSeriesItem,
    IStateType,
    IStateUtilitiesService,
} from "./interfaces";




@injectable()
export class LongShortRatioStateService implements ILongShortRatioStateService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Requirements
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly requirement: number = 0.25;
    private readonly strongRequirement: number = 1;



    /**
     * Interval
     * Every intervalSeconds, the long/short ratio state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 10;


    /**
     * Exchange States
     * The full state objects by exchange. Can be retrieved through the endpoint.
     */
    private binance: IExchangeLongShortRatioState;
    private binance_tta: IExchangeLongShortRatioState;
    private binance_ttp: IExchangeLongShortRatioState;
    private huobi_tta: IExchangeLongShortRatioState;
    private huobi_ttp: IExchangeLongShortRatioState;


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: ILongShortRatioState;



    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultState();
        this.binance = this.getDefaultExchangeState();
        this.binance_tta = this.getDefaultExchangeState();
        this.binance_ttp = this.getDefaultExchangeState();
        this.huobi_tta = this.getDefaultExchangeState();
        this.huobi_ttp = this.getDefaultExchangeState();
    }









    /***************
     * Initializer *
     ***************/





    /**
     * Calculates the state and initializes the interval that will
     * update the state every intervalSeconds.
     * @returns  Promise<void>
     */
    public async initialize(): Promise<void> {
        // Calculate the state and initialize the interval
        await this.updateState();
        this.stateInterval = setInterval(async () => {
            await this.updateState()
        }, this.intervalSeconds * 1000);
    }





    /**
     * Stops the network fee state interval.
     */
    public stop(): void {
        if (this.stateInterval) clearInterval(this.stateInterval);
        this.stateInterval = undefined;
    }






    


    /********************
     * State Management *
     ********************/






    /**
     * Retrieves the long/short ratio records from Binance's API, processes 
     * them and calculates the current state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        // Init the list of average states by exchange
        let averageStatesByExchange: IStateType[] = [];

        // Build Binance Global State
        try {
            const series: ISplitStateSeriesItem[] = await this.getBinanceSeries("globalLongShortAccountRatio");
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.binance = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.binance.s);
        } catch (e) {
            this.binance = this.getDefaultExchangeState();
        }

        // Build Binance Top-Trader Account State
        try {
            const series: ISplitStateSeriesItem[] = await this.getBinanceSeries("topLongShortAccountRatio");
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.binance_tta = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.binance_tta.s);
        } catch (e) {
            this.binance_tta = this.getDefaultExchangeState();
        }

        // Build Binance Top-Trader Position State
        try {
            const series: ISplitStateSeriesItem[] = await this.getBinanceSeries("topLongShortPositionRatio");
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.binance_ttp = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.binance_ttp.s);
        } catch (e) {
            this.binance_ttp = this.getDefaultExchangeState();
        }

        // Build Huobi Top-Trader Account State
        try {

        } catch (e) {
            this.huobi_tta = this.getDefaultExchangeState();
        }

        // Build Huobi Top-Trader Position State
        try {

        } catch (e) {
            this.huobi_ttp = this.getDefaultExchangeState();
        }

        // If there are no states, set it to neutral
        if (!averageStatesByExchange.length) averageStatesByExchange = [0];

        // Finally, update the state
        this.state = {
            s: this._stateUtils.calculateAverageState(averageStatesByExchange),
            binance: this.binance.s,
            binance_tta: this.binance_tta.s,
            binance_ttp: this.binance_ttp.s,
            huobi_tta: this.huobi_tta.s,
            huobi_ttp: this.huobi_ttp.s,
        }
    }









    /*******************************
     * Long/Short Ratio Retrievers *
     *******************************/






    /**
     * Retrieves the open interest from Binance's API for the current window
     * and formats it into the required format.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getBinanceSeries(kind: IBinanceLongShortRatioKind): Promise<ISplitStateSeriesItem[]> {
        // Retrieve the list from binance
        const records: IBinanceLongShortRatio[] = await this._binance.getLongShortRatio(kind);

        // Return the series
        return records.map(f => { return {x: f.timestamp, y: Number(f.longShortRatio)}});
    }
















    /**************
     * Retrievers *
     **************/






    /**
     * Retrieves the state of an exchange based on an id.
     * @param id 
     * @returns IExchangeLongShortRatioState
     */
    public getExchangeState(id: IExchangeLongShortRatioID): IExchangeLongShortRatioState {
        switch (id) {
            case "binance":
                return this.binance;
            case "binance_tta":
                return this.binance_tta;
            case "binance_ttp":
                return this.binance_ttp;
            case "huobi_tta":
                return this.huobi_tta;
            case "huobi_ttp":
                return this.huobi_tta;
            default:
                return this.getDefaultExchangeState();
        }
    }













    /****************
     * Misc Helpers *
     ****************/





    /**
     * Retrieves the module's default state.
     * @returns IOpenInterestState
     */
    public getDefaultState(): ILongShortRatioState {
        return {
            s: 0,
            binance: 0,
            binance_tta: 0,
            binance_ttp: 0,
            huobi_tta: 0,
            huobi_ttp: 0,
        }
    }





    /**
     * Retrieves the default state for an exchange.
     * @returns IOpenInterestState
     */
    public getDefaultExchangeState(): IExchangeLongShortRatioState {
        return {
            s: 0,
            ss: {
                s100: {s: 0, c: 0},
                s75: {s: 0, c: 0},
                s50: {s: 0, c: 0},
                s25: {s: 0, c: 0},
                s15: {s: 0, c: 0},
                s10: {s: 0, c: 0},
                s5: {s: 0, c: 0},
                s2: {s: 0, c: 0},
            },
            w: []
        }
    }
}