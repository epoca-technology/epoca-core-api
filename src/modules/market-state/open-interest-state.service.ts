import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceOpenInterest, IBinanceService } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    IOpenInterestState,
    IOpenInterestStateService,
    IStateBandsResult,
    IStateUtilitiesService,
} from "./interfaces";




@injectable()
export class OpenInterestStateService implements IOpenInterestStateService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;

    /**
     * Groups
     * The number of groups that will be built.
     */
    private readonly groups: number = 10;
    

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
    private readonly intervalSeconds: number = 60 * 5; // ~5 minutes


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
            // Retrieve the list from binance
            const records: IBinanceOpenInterest[] = await this._binance.getOpenInterest();

            // Build the averaged list of values
            const values: number[] = this._stateUtils.buildAveragedGroups(
                records.map(f => Number(f.sumOpenInterestValue)), 
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
            console.error("The open interest state could not be updated due to an error in Binance API.", e);
            this._apiError.log("OpenInterestState.updateState", e);
            this.state = this.getDefaultState();
        }
    }











    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns INetworkFeeState
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