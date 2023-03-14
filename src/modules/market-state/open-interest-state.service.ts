import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceOpenInterest, IBinanceService } from "../binance";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IUtilitiesService } from "../utilities";
import { 
    IExchangeOpenInterestID,
    IExchangeOpenInterestState,
    IOpenInterestState,
    IOpenInterestStateService,
    ISplitStateSeriesItem,
    IStateType,
    IStateUtilitiesService,
} from "./interfaces";




@injectable()
export class OpenInterestStateService implements IOpenInterestStateService {
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
     * Every intervalSeconds, the open interest state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 10;


    /**
     * Exchange States
     * The full state objects by exchange. Can be retrieved through the endpoint.
     */
    private binance: IExchangeOpenInterestState;
    private bybit: IExchangeOpenInterestState;
    private huobi: IExchangeOpenInterestState;
    private okx: IExchangeOpenInterestState;


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: IOpenInterestState;



    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultState();
        this.binance = this.getDefaultExchangeState();
        this.bybit = this.getDefaultExchangeState();
        this.huobi = this.getDefaultExchangeState();
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
     * Stops the open interest state interval.
     */
    public stop(): void {
        if (this.stateInterval) clearInterval(this.stateInterval);
        this.stateInterval = undefined;
    }
















    /********************
     * State Management *
     ********************/

    




    /**
     * Retrieves the open interest records from a series of exchanges
     * and processes them. If an exchange throws an error of any kind,
     * it won't be added into the average calculation and its state will
     * be replaced with the default.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        // Init the list of average states by exchange
        let averageStatesByExchange: IStateType[] = [];

        // Build Binance State
        try {
            const series: ISplitStateSeriesItem[] = await this.getBinanceSeries();
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.binance = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.binance.s);
        } catch (e) {
            this.binance = this.getDefaultExchangeState();
        }

        // Build ByBit State
        try {
            const series: ISplitStateSeriesItem[] = await this.getByBitSeries();
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.bybit = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.bybit.s);
        } catch (e) {
            this.bybit = this.getDefaultExchangeState();
        }

        // Build Huobi State
        try {
            const series: ISplitStateSeriesItem[] = await this.getHuobiSeries();
            const { averageState, splitStates } = this._stateUtils.calculateCurrentState(series, this.requirement, this.strongRequirement);
            this.huobi = { s: averageState, ss: splitStates, w: series };
            averageStatesByExchange.push(this.huobi.s);
        } catch (e) {
            this.huobi = this.getDefaultExchangeState();
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
            bybit: this.bybit.s,
            huobi: this.huobi.s,
            okx: this.okx.s,
        }
    }












    /****************************
     * Open Interest Retrievers *
     ****************************/






    /**
     * Retrieves the open interest from Binance's API for the current window.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getBinanceSeries(): Promise<ISplitStateSeriesItem[]> {
        try {
            // Retrieve the list from binance
            const records: IBinanceOpenInterest[] = await this._binance.getOpenInterest();

            // Return the series
            return records.map(f => { return {x: f.timestamp, y: Number(f.sumOpenInterestValue)}});
        } catch (e) {
            this._apiError.log("OpenInterestState.getBinanceSeries", e);
            throw e;
        }
    }






    /**
     * Retrieves the open interest from ByBit's API for the current window.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getByBitSeries(): Promise<ISplitStateSeriesItem[]> {
        try {
            // Build options
            const startTime: number = moment().subtract(32, "hours").valueOf();
            const options: IExternalRequestOptions = {
                host: "api.bybit.com",
                path: `/v5/market/open-interest?category=inverse&symbol=BTCUSD&intervalTime=15min&startTime=${startTime}&endTime=${Date.now()}&limit=200`,
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
                throw new Error(this._utils.buildApiError(`ByBit returned an invalid HTTP response code (${response.statusCode}) 
                when retrieving the open interest.`));
            }

            // Validate the response's data
            if (
                !response.data || 
                !response.data.result || 
                !Array.isArray(response.data.result.list) || 
                !response.data.result.list.length
            ) {
                console.log(response);
                throw new Error(this._utils.buildApiError("ByBit returned an invalid open interest list."));
            }

            // Build the open interest list
            let values: ISplitStateSeriesItem[] = response.data.result.list.map((val: {openInterest: string, timestamp: string}) => { 
                return { x: Number(val.timestamp), y: Number(val.openInterest) }
            });

            // Reverse the values so the oldest value is first
            values.reverse();

            // Return the series
            return values;
        } catch (e) {
            this._apiError.log("OpenInterestState.getByBitSeries", e);
            throw e;
        }
    }






    /**
     * Retrieves the open interest from Huobi's API for the current window.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getHuobiSeries(): Promise<ISplitStateSeriesItem[]> {
        try {
            // Build options
            const options: IExternalRequestOptions = {
                host: "api.hbdm.com",
                path: `/api/v1/contract_his_open_interest?symbol=BTC&contract_type=this_week&period=15min&size=128&amount_type=1`,
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
                when retrieving the open interest.`));
            }

            // Validate the response's data
            if (
                !response.data || 
                !response.data.data || 
                !Array.isArray(response.data.data.tick) || 
                !response.data.data.tick.length
            ) {
                console.log(response);
                throw new Error(this._utils.buildApiError("Huobi returned an invalid open interest list."));
            }

            // Build the open interest list
            let values: ISplitStateSeriesItem[] = response.data.data.tick.map((val: {volume: string, amount_type: number, ts: number}) => {
                return { x: val.ts, y: Number(val.volume) }
            });

            // Reverse the values so the oldest value is first
            values.reverse();

            // Return the series
            return values;
        } catch (e) {
            this._apiError.log("OpenInterestState.getHuobiSeries", e);
            throw e;
        }
    }






    /**
     * Retrieves the open interest from OKX's API for the current window.
     * @returns Promise<ISplitStateSeriesItem[]>
     */
    private async getOKXSeries(): Promise<ISplitStateSeriesItem[]> {
        try {
            // Build options
            const begin: number = moment().subtract(32, "hours").valueOf();
            const options: IExternalRequestOptions = {
                host: "www.okx.com",
                path: `/api/v5/rubik/stat/contracts/open-interest-volume?ccy=BTC&period=5m&begin=${begin}`,
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
                when retrieving the open interest.`));
            }

            // Validate the response's data
            if (
                !response.data || 
                !response.data.data || 
                !Array.isArray(response.data.data) || 
                !response.data.data.length
            ) {
                console.log(response);
                throw new Error(this._utils.buildApiError("OKX returned an invalid open interest list."));
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
            this._apiError.log("OpenInterestState.getOKXSeries", e);
            throw e;
        }
    }








    


    /**************
     * Retrievers *
     **************/






    /**
     * Retrieves the state of an exchange based on an id.
     * @param id 
     * @returns IExchangeOpenInterestState
     */
    public getExchangeState(id: IExchangeOpenInterestID): IExchangeOpenInterestState {
        switch (id) {
            case "binance":
                return this.binance;
            case "bybit":
                return this.bybit;
            case "huobi":
                return this.huobi;
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
    public getDefaultState(): IOpenInterestState {
        return {
            s: 0,
            binance: 0,
            bybit: 0,
            huobi: 0,
            okx: 0,
        }
    }





    /**
     * Retrieves the default state for an exchange.
     * @returns IOpenInterestState
     */
    public getDefaultExchangeState(): IExchangeOpenInterestState {
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