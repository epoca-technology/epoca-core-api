import {injectable, inject, postConstruct} from "inversify";
import * as moment from "moment";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IUtilitiesService } from "../utilities";
import { 
    IOpenInterestState,
    IOpenInterestOKXStateService,
    IStateBandsResult,
    IStateUtilitiesService,
} from "./interfaces";




@injectable()
export class OpenInterestOKXStateService implements IOpenInterestOKXStateService {
    // Inject dependencies
    @inject(SYMBOLS.ExternalRequestService)             private _er: IExternalRequestService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Groups
     * The number of groups that will be built.
     */
    private readonly groups: number = 16;
    

    /**
     * Window Change
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly minChange: number = 1;
    private readonly strongChange: number = 5;


    /**
     * Interval
     * Every intervalSeconds, the open interest state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 10;


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: IOpenInterestState;



    constructor() {}

    @postConstruct()
    public onInit(): void {
        this.state = this.getDefaultState();
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






    

    


    /**************
     * Retrievers *
     **************/




    /**
     * Retrieves the interest records from Binance's API, processes 
     * them and calculates the current state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        try {
            // Retrieve the list from bybit
            const openInterestHist: number[] = await this.getOpenInterest();

            // Build the averaged list of values
            const values: number[] = this._stateUtils.buildAveragedGroups(
                openInterestHist, 
                this.groups
            );

            // Calculate the window bands
            const bands: IStateBandsResult = this._stateUtils.calculateBands(
                <number>this._utils.calculateMin(values), 
                <number>this._utils.calculateMax(values)
            );

            // Calculate the state
            const { state, state_value } = this._stateUtils.calculateState(
                values[0],
                values.at(-1),
                bands,
                this.minChange,
                this.strongChange
            );

            // Finally, update the state
            this.state = {
                state: state,
                state_value: state_value,
                upper_band: bands.upper_band,
                lower_band: bands.lower_band,
                ts: Date.now(),
                interest: values
            };
        } catch (e) {
            console.error("The open interest okx state could not be updated due to an error in OKX's API.", e);
            this._apiError.log("OpenInterestOKXState.updateState", e);
            this.state = this.getDefaultState();
        }
    }








    /**
     * Retrieves the last 32 hours worth of open interest from
     * OKX's API.
     * @returns Promise<number[]>
     */
    private async getOpenInterest(): Promise<number[]> {
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
        let values: number[] = response.data.data.map((val: string[]) => Number(val[1]));

        // Reverse the values so the oldest value is first
        values.reverse();

        // Return the series
        return values;
    }












    /**
     * Retrieves the module's default state.
     * @returns IOpenInterestState
     */
    public getDefaultState(): IOpenInterestState {
        return {
            state: 0,
            state_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            interest: []
        }
    }
}