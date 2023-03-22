import {injectable, inject, postConstruct} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBinanceLongShortRatio, IBinanceService } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    ILongShortRatioState,
    ILongShortRatioStateService,
    IStateBandsResult,
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
     * Groups
     * The number of groups that will be built.
     */
    private readonly groups: number = 16;
    

    /**
     * Window Change
     * The percentage changes that must exist in the window in order for
     * it to have a state.
     */
     private readonly minChange: number = 2;
     private readonly strongChange: number = 10;


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
    public state: ILongShortRatioState;



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
     * Retrieves the long/short ratio records from Binance's API, processes 
     * them and calculates the current state.
     * @returns Promise<void>
     */
    private async updateState(): Promise<void> {
        try {
            // Retrieve the list from binance
            const records: IBinanceLongShortRatio[] = await this._binance.getLongShortRatio("globalLongShortAccountRatio");

            // Build the averaged list of values
            /*const values: number[] = this._stateUtils.buildAveragedGroups(
                records.map(f => Number(f.longShortRatio)), 
                this.groups
            );*/
            const values: number[] = records.map(f => Number(f.longShortRatio));

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
                ratio: values
            };
        } catch (e) {
            console.error("The long short ratio state could not be updated due to an error in Binance API.", e);
            this._apiError.log("LongShortRatioState.updateState", e);
            this.state = this.getDefaultState();
        }
    }











    /**
     * Retrieves the module's default state. This function must overriden.
     * @returns INetworkFeeState
     */
    public getDefaultState(): ILongShortRatioState {
        return {
            state: 0,
            state_value: 0,
            upper_band: { start: 0, end: 0 },
            lower_band: { start: 0, end: 0 },
            ts: Date.now(),
            ratio: []
        }
    }
}