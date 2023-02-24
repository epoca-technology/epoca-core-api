import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IUtilitiesService } from "../utilities";
import { 
    IMempoolBlockFeeRecord,
    INetworkFeeState,
    INetworkFeeStateService,
    IStateBandsResult,
    IStateUtilitiesService,
} from "./interfaces";




@injectable()
export class NetworkFeeStateService implements INetworkFeeStateService {
    // Inject dependencies
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.ExternalRequestService)             private _externalRequest: IExternalRequestService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Groups
     * The number of groups that will be built.
     */
    private readonly groups: number = 32;
    

    /**
     * Window Change
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
    private readonly minChange: number = 15;
    private readonly strongChange: number = 50;


    /**
     * Network Fee Interval
     * Every intervalSeconds, the network fee state will be calculated and stored temporarily.
     */
    private stateInterval: any;
    private readonly intervalSeconds: number = 60 * 60; // ~60 minutes


    /**
     * Active State
     * The latest state calculated by the service.
     */
    public state: INetworkFeeState;



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
     * update the state every ~10 minutes.
     * @returns  Promise<void>
     */
    public async initialize(): Promise<void> {
        // Calculate the state and initialize the interval
        await this.updateState();
        this.stateInterval = setInterval(async () => {
            try { await this.updateState() } 
            catch (e) { 
                console.error(e);
                this._apiError.log("NetworkFeeState.initialize.interval", e)
            }
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
     * Retrieves the fee records from Mempool.space's API, processes 
     * them and calculates the current state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        try {
            // Retrieve the raw fee records
            const rawRecords: IMempoolBlockFeeRecord[] = await this.getRawFeeRecords();

            // Build the averaged list of fees
            const fees: number[] = this._stateUtils.buildAveragedGroups(rawRecords.map(f => f.avgFee_50), this.groups);

            // Calculate the window bands
            const bands: IStateBandsResult = this._stateUtils.calculateBands(
                <number>this._utils.calculateMin(fees), 
                <number>this._utils.calculateMax(fees)
            );

            // Calculate the state
            const { state, state_value } = this._stateUtils.calculateState(
                fees[0],
                fees.at(-1),
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
                fees: fees,
                height: rawRecords.at(-1).avgHeight
            };
        } catch (e) {
            console.error("The network fee state could not be updated due to an error in Mempool.Space API.", e);
            this._apiError.log("NetworkFeeState.updateState", e);
            this.state = this.getDefaultState();
        }
    }








    /**
     * Retrieves the latest fee records from mempool.space's api.
     * @returns Promise<IMempoolBlockFeeRecord[]>
     */
    private async getRawFeeRecords(): Promise<IMempoolBlockFeeRecord[]> {
        try { return await this._getRawFeeRecords() } 
        catch (e) {
            console.error("1) Error when retrieving fee records from Mempool.space. Attempting again in a few seconds...", e);
            await this._utils.asyncDelay(3);
            try { return await this._getRawFeeRecords() } 
            catch (e) {
                console.error("2) Error when retrieving fee records from Mempool.space. Attempting again in a few seconds...", e);
                await this._utils.asyncDelay(5);
                try { return await this._getRawFeeRecords() } 
                catch (e) {
                    console.error("3) Error when retrieving fee records from Mempool.space. Attempting again in a few seconds...", e);
                    await this._utils.asyncDelay(5);
                    return await this._getRawFeeRecords();
                }
            }
        }
    }
    private async _getRawFeeRecords(): Promise<IMempoolBlockFeeRecord[]> {
        // Build options
        const options: IExternalRequestOptions = {
            host: "mempool.space",
            path: "/api/v1/mining/blocks/fee-rates/24h",
            method: "GET",
            headers: {
                "Content-Type": "application/json"
            }
        };
        
        // Retrieve the fees
        const response: IExternalRequestResponse = await this._externalRequest.request(options);

        // Validate the response
        if (!response || typeof response != "object" || response.statusCode != 200) {
            throw new Error(this._utils.buildApiError(`Mempool.space returned an invalid HTTP response code (${response.statusCode}) 
            when retrieving the fee records.`, 28000));
        }

        // Validate the response's data
        if (!response.data || !Array.isArray(response.data) || !response.data.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError("Mempool.space returned an invalid fee record series.", 28001));
        }

        // Return the series
        return response.data;
    }








    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns INetworkFeeState
     */
    public getDefaultState(): INetworkFeeState {
        return {
            state: 0,
            state_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            height: 0,
            fees: []
        }
    }
}