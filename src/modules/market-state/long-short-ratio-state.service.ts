import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceLongShortRatio, IBinanceLongShortRatioKind, IBinanceService } from "../binance";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
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
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;
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
    private okx: IExchangeLongShortRatioState;


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
        this.okx = this.getDefaultExchangeState();
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
     * Stops the long/short ratio state interval.
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
            const series: ISplitStateSeriesItem[] = await this.getHuobiSeries("contract_elite_account_ratio");
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.huobi_tta = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.huobi_tta.s);
        } catch (e) {
            this.huobi_tta = this.getDefaultExchangeState();
        }

        // Build Huobi Top-Trader Position State
        try {
            const series: ISplitStateSeriesItem[] = await this.getHuobiSeries("contract_elite_position_ratio");
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.huobi_ttp = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.huobi_ttp.s);
        } catch (e) {
            this.huobi_ttp = this.getDefaultExchangeState();
        }

        // Build OKX State
        try {
            const series: ISplitStateSeriesItem[] = await this.getOKXSeries();
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.okx = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.okx.s);
        } catch (e) {
            this.okx = this.getDefaultExchangeState();
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
            okx: this.okx.s,
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
        try {
        // Retrieve the list from binance
        const records: IBinanceLongShortRatio[] = await this._binance.getLongShortRatio(kind);

        // Return the series
        return records.map(f => { return {x: f.timestamp, y: Number(f.longShortRatio)}});
        } catch (e) {
            this._apiError.log("LongShortRatioState.getBinanceSeries", e);
            throw e;
        }
    }








    /**
     * Retrieves the long/short ratio from Huobi's API for the current window
     * based on the kind.
     * @param kind
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getHuobiSeries(kind: "contract_elite_account_ratio"|"contract_elite_position_ratio"): Promise<ISplitStateSeriesItem[]> {
        try {
            // Build options
            const options: IExternalRequestOptions = {
                host: "api.hbdm.com",
                path: `/api/v1/${kind}?symbol=BTC&period=60min`,
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            };

            // Retrieve the order book
            const response: IExternalRequestResponse = await this._er.request(options);

            // Validate the response
            if (!response || typeof response != "object" || response.statusCode != 200) {
                console.log(response);
                throw new Error(this._utils.buildApiError(`Huobi returned an invalid HTTP response code (${response.statusCode}) 
                when retrieving the long/short ratio ${kind}.`));
            }

            // Validate the response's data
            if (
                !response.data || 
                !response.data.data || 
                !Array.isArray(response.data.data.list) || 
                !response.data.data.list.length
            ) {
                console.log(response);
                throw new Error(this._utils.buildApiError("Huobi returned an invalid open interest list."));
            }

            // Build the raw long/short ratio list list
            let values: ISplitStateSeriesItem[] = response.data.data.list.map((val: {
                buy_ratio: number, 
                sell_ratio: number, 
                locked_ratio: number, 
                ts: number
            }) => {
                return { x: val.ts, y: val.buy_ratio / val.sell_ratio }
            });

            // Since Huobi only provides the last 30 periods, expand the list so it can be properly analyzed
            let final: ISplitStateSeriesItem[] = [];
            for (let i = 0; i < values.length; i++) {
                // Add the record to the list
                final.push({x: values[i].x, y: values[i].y});

                // If it isn't the last record, add a middle one
                if (i < values.length - 1) {
                    final.push({
                        x: values[i + 1].x - 1, 
                        y: <number>this._utils.calculateAverage([values[i].y, values[i + 1].y], {dp: 6})
                    });
                }
            }

            // Return the series
            return final;
        } catch (e) {
            this._apiError.log("LongShortRatioState.getHuobiSeries", e);
            throw e;
        }
    }









    /**
     * Retrieves the long/short ratio from OKX's API for the current window.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getOKXSeries(): Promise<ISplitStateSeriesItem[]> {
        try {
            // Build options
            const begin: number = moment().subtract(32, "hours").valueOf();
            const options: IExternalRequestOptions = {
                host: "www.okx.com",
                path: `/api/v5/rubik/stat/contracts/long-short-account-ratio?ccy=BTC&period=5m&begin=${begin}`,
                method: "GET",
                headers: {
                    "Content-Type": "application/json"
                }
            };

            // Retrieve the order book
            const response: IExternalRequestResponse = await this._er.request(options);

            // Validate the response
            if (!response || typeof response != "object" || response.statusCode != 200) {
                console.log(response);
                throw new Error(this._utils.buildApiError(`OKX returned an invalid HTTP response code (${response.statusCode}) 
                when retrieving the long/short ratio.`));
            }

            // Validate the response's data
            if (
                !response.data || 
                !response.data.data || 
                !Array.isArray(response.data.data) || 
                !response.data.data.length
            ) {
                console.log(response);
                throw new Error(this._utils.buildApiError("OKX returned an invalid long/short ratio list."));
            }

            // Build the open interest list
            let values: ISplitStateSeriesItem[] = response.data.data.map((val: string[]) => {
                return { x: Number(val[0]), y: Number(val[1])}
            });

            // Reverse the values so the oldest value is first
            values.reverse();

            // Return the series
            return values;
        } catch (e) {
            this._apiError.log("LongShortRatioState.getOKXSeries", e);
            throw e;
        }
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
                return this.huobi_ttp;
            case "okx":
                return this.okx;
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
            okx: 0,
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