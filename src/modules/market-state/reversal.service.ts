import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick, ICandlestickService } from "../candlestick";
import { IDatabaseService } from "../database";
import { IUtilitiesService, IValidationsService } from "../utilities";
import {
    ICoinsCompressedState,
    IKeyZoneState,
    ILiquidityState,
    IMinifiedReversalState,
    IReversalConfiguration,
    IReversalService,
    IReversalState,
    ISplitStateID,
    IStateType,
    IStateUtilitiesService,
    IVolumeStateService,
} from "./interfaces";




@injectable()
export class ReversalService implements IReversalService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;
    @inject(SYMBOLS.VolumeStateService)                 private _volume: IVolumeStateService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    /**
     * Configuration
     * The configuration that will be used in order to calculate the 
     * reversal state.
     */
    public config: IReversalConfiguration;



    /**
     * Reversal State
     * The full state object that constantly evaluates active KeyZone Events.
     */
    private state: IReversalState;
    private activeCandlestick: ICandlestick|undefined;

    /**
     * Coin State Splits
     * The state splits that will be used in order to calculate the coins'
     * score.
     */
    private readonly stateSplits: ISplitStateID[] = [ "s15", "s10", "s5", "s2" ]


    constructor() { }










    /******************
     * Initialization *
     ******************/



    /**
     * Initializes the configuration for the window module. If it hasn't 
     * already been set, it will initialize the default values.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the configuration
        await this.initializeConfiguration();

        // Build the default state
        this.state = this.getDefaultFullState();
    }





    /**
     * ...
     */
    public stop(): void {

    }

















    /*********************
     * State Calculation *
     *********************/






    /**
     * Calculates the reversal state based on the KeyZone Event. If there is none,
     * it will return the default state. If there was an event but faded away,
     * the reversal state is stored in the db.
     * @param keyzones
     * @param liquidity
     * @param coins
     * @returns IMinifiedReversalState
     */
    public calculateState(keyzones: IKeyZoneState, liquidity: ILiquidityState, coins: ICoinsCompressedState): IMinifiedReversalState {
        // If there is a KeyZone Event but not a local reversal one, initialize it
        if (this.state.id == 0 && keyzones.event) {
            this.onKeyZoneContactEvent(keyzones, coins);
        }

        // If there is a local reversal event but the KeyZone Event faded away, close it
        else if (this.state.id != 0 && !keyzones.event) {
            this.onKeyZoneEventEnd(coins);
        }

        // If there is a state, update it with the latest data
        if (this.state.id != 0) {
            this.onMarketStateChanges(liquidity, coins);
        }

        // Finally, return the minified state
        return {
            id: this.state.id,
            k: this.state.k,
            s: this.state.id == 0 ? 0: this.state.scr.g.at(-1),
            e: this.state.e
        };
    }











    /* Event Management */





    /**
     * Triggers whenever the price has just come in contact with a KeyZone. 
     * Takes care of initializing the state's essential data.
     * @param keyzones 
     * @param coins 
     */
    private onKeyZoneContactEvent(keyzones: IKeyZoneState, coins: ICoinsCompressedState): void {
        // Build the state skeleton
        this.state = {
            id: keyzones.event.t,
            end: undefined,
            k: keyzones.event.k == "s" ? 1: -1,
            kze: keyzones.event,
            av: 0,
            vg: this._volume.state.mh,
            ics: coins,
            ecs: null,
            fcs: null,
            scr: { g: [], v: [], l: [], c: [] },
            e: null
        };

        // Set the active candlestick
        this.activeCandlestick = this._candlestick.predictionLookback.at(-1);
    }








    /**
     * Triggers whenever the KeyZone event ends. Saves the state into the
     * database and resets all the values.
     */
    private onKeyZoneEventEnd(coins: ICoinsCompressedState): void {
        // Firstly, set the end and the final coins' states
        this.state.end = Date.now();
        this.state.fcs = coins;

        // Store the state in the db
        this.saveState(this.state);

        // Reset the values
        this.state = this.getDefaultFullState();
        this.activeCandlestick = undefined;
    }










    /**
     * Triggers whenever there is an active state and the market state
     * has changed. Updates the state and can issue signals if the 
     * configured requirements are met.
     * @param liquidity 
     * @param coins 
     */
    private onMarketStateChanges(liquidity: ILiquidityState, coins: ICoinsCompressedState): void {
        // Initialize the current score
        let currentScore: number = 0;

        // Calculate the volume score
        const { accumulatedVol,  volScore } = this.calculateVolumeScore();
        currentScore += volScore;

        // Calculate the liquidity score
        const liqScore: number = this.calculateLiquidityScore(liquidity);
        currentScore += liqScore;

        // Calculate the coins' score
        const coinsScore: number = this.calculateCoinsScore(coins);
        currentScore += coinsScore;

        // Set the new scores on the state
        this.state.av = accumulatedVol;
        this.state.scr.g.push(currentScore);
        this.state.scr.v.push(volScore);
        this.state.scr.l.push(liqScore);
        this.state.scr.c.push(coinsScore);

        // If an event hasn't been issued and the score has met the requirements, issue it
        if (!this.state.e && currentScore >= this.config.min_event_score) {
            // Retrieve the event compliant symbols (if any)
            const compliantSymbols: string[] = this.getEventCompliantSymbols(coins);

            // Issue the event if symbols were found
            if (compliantSymbols.length) {
                // Set the event with all the symbols that have reacted accordingly
                this.state.e = {
                    t: Date.now(),
                    s: compliantSymbols
                }

                // Store the state of all the coins
                this.state.ecs = coins;
            }
        }
    }








    /* Score Calculations */






    /**
     * Calculates the currently accumulated volume as well as the 
     * score.
     * @returns {accumulatedVol: number, volScore: number}
     */
    private calculateVolumeScore(): {accumulatedVol: number, volScore: number} {
        // Init the accumulated volume
        let accumulatedVol: number = this.state.av;

        // Init the active market candlestick
        const marketCandlestick: ICandlestick = this._candlestick.predictionLookback.at(-1);

        // If the candlestick has been set, update the current accumulation
        if (this.activeCandlestick) {

            // If it is the same candlestick, add the volume difference to the accumulation
            if (this.activeCandlestick.ot == marketCandlestick.ot) {
                accumulatedVol += marketCandlestick.v - this.activeCandlestick.v;
            }

            // If it is a new candlestick, add the entire volume to the accumulation
            else {
                accumulatedVol += marketCandlestick.v;
            }

            // Update the active candlestick
            this.activeCandlestick = marketCandlestick;
        }

        // If the candlestick has not yet been set, do so
        else {
            this.activeCandlestick = marketCandlestick;
        }

        // Calculate the share that has been accumulated
        const accumulatedVolShare: number = <number>this._utils.calculatePercentageOutOfTotal(
            accumulatedVol,
            this.state.vg
        );

        // Finally, return the new accumulation and the score
        return { 
            accumulatedVol: accumulatedVol, 
            volScore: <number>this._utils.outputNumber(
                (accumulatedVolShare / 100) * this.config.score_weights.volume
            )
        }
    }







    /**
     * Calculates the liquidity score based on the kind of reversal 
     * taking place.
     * @param liq 
     * @returns number
     */
    private calculateLiquidityScore(liq: ILiquidityState): number {
        // Init the score
        let score: number = 0;

        // Calculate the score based on the bid liquidity power
        if      (liq.blp >= 98) { score = this.state.k == 1 ? 1.00: 0.01 }
        else if (liq.blp >= 96) { score = this.state.k == 1 ? 0.99: 0.02 }
        else if (liq.blp >= 94) { score = this.state.k == 1 ? 0.98: 0.03 }
        else if (liq.blp >= 92) { score = this.state.k == 1 ? 0.97: 0.04 }
        else if (liq.blp >= 90) { score = this.state.k == 1 ? 0.96: 0.05 }
        else if (liq.blp >= 88) { score = this.state.k == 1 ? 0.95: 0.06 }
        else if (liq.blp >= 86) { score = this.state.k == 1 ? 0.94: 0.07 }
        else if (liq.blp >= 84) { score = this.state.k == 1 ? 0.92: 0.08 }
        else if (liq.blp >= 82) { score = this.state.k == 1 ? 0.90: 0.09 }
        else if (liq.blp >= 80) { score = this.state.k == 1 ? 0.88: 0.10 }
        else if (liq.blp >= 78) { score = this.state.k == 1 ? 0.86: 0.11 }
        else if (liq.blp >= 76) { score = this.state.k == 1 ? 0.84: 0.12 }
        else if (liq.blp >= 74) { score = this.state.k == 1 ? 0.82: 0.13 }
        else if (liq.blp >= 72) { score = this.state.k == 1 ? 0.80: 0.14 }
        else if (liq.blp >= 70) { score = this.state.k == 1 ? 0.77: 0.15 }
        else if (liq.blp >= 68) { score = this.state.k == 1 ? 0.74: 0.17 }
        else if (liq.blp >= 66) { score = this.state.k == 1 ? 0.71: 0.20 }
        else if (liq.blp >= 64) { score = this.state.k == 1 ? 0.68: 0.23 }
        else if (liq.blp >= 62) { score = this.state.k == 1 ? 0.65: 0.26 }
        else if (liq.blp >= 60) { score = this.state.k == 1 ? 0.62: 0.29 }
        else if (liq.blp >= 58) { score = this.state.k == 1 ? 0.59: 0.32 }
        else if (liq.blp >= 56) { score = this.state.k == 1 ? 0.56: 0.35 }
        else if (liq.blp >= 54) { score = this.state.k == 1 ? 0.53: 0.38 }
        else if (liq.blp >= 52) { score = this.state.k == 1 ? 0.50: 0.41 }
        else if (liq.blp >= 50) { score = this.state.k == 1 ? 0.47: 0.44 }
        else if (liq.blp >= 48) { score = this.state.k == 1 ? 0.44: 0.47 }
        else if (liq.blp >= 46) { score = this.state.k == 1 ? 0.41: 0.50 }
        else if (liq.blp >= 44) { score = this.state.k == 1 ? 0.38: 0.53 }
        else if (liq.blp >= 42) { score = this.state.k == 1 ? 0.35: 0.56 }
        else if (liq.blp >= 40) { score = this.state.k == 1 ? 0.32: 0.59 }
        else if (liq.blp >= 38) { score = this.state.k == 1 ? 0.29: 0.62 }
        else if (liq.blp >= 36) { score = this.state.k == 1 ? 0.26: 0.65 }
        else if (liq.blp >= 34) { score = this.state.k == 1 ? 0.23: 0.68 }
        else if (liq.blp >= 32) { score = this.state.k == 1 ? 0.20: 0.71 }
        else if (liq.blp >= 30) { score = this.state.k == 1 ? 0.17: 0.74 }
        else if (liq.blp >= 28) { score = this.state.k == 1 ? 0.15: 0.77 }
        else if (liq.blp >= 26) { score = this.state.k == 1 ? 0.14: 0.80 }
        else if (liq.blp >= 24) { score = this.state.k == 1 ? 0.13: 0.82 }
        else if (liq.blp >= 22) { score = this.state.k == 1 ? 0.12: 0.84 }
        else if (liq.blp >= 20) { score = this.state.k == 1 ? 0.11: 0.86 }
        else if (liq.blp >= 18) { score = this.state.k == 1 ? 0.10: 0.88 }
        else if (liq.blp >= 16) { score = this.state.k == 1 ? 0.09: 0.90 }
        else if (liq.blp >= 14) { score = this.state.k == 1 ? 0.08: 0.92 }
        else if (liq.blp >= 12) { score = this.state.k == 1 ? 0.07: 0.94 }
        else if (liq.blp >= 10) { score = this.state.k == 1 ? 0.06: 0.95 }
        else if (liq.blp >= 8)  { score = this.state.k == 1 ? 0.05: 0.96 }
        else if (liq.blp >= 6)  { score = this.state.k == 1 ? 0.04: 0.97 }
        else if (liq.blp >= 4)  { score = this.state.k == 1 ? 0.03: 0.98 }
        else if (liq.blp >= 2)  { score = this.state.k == 1 ? 0.02: 0.99 }
        else                    { score = this.state.k == 1 ? 0.01: 1.00 }

        // Finally, return the score
        return <number>this._utils.outputNumber(score * this.config.score_weights.liquidity);
    }






    /**
     * Calculates the coins score based on the kind of reversal 
     * taking place.
     * @param coins 
     * @returns number
     */
    private calculateCoinsScore(coins: ICoinsCompressedState): number {
        // Init the list of symbols
        const symbols: string[] = Object.keys(coins.csbs);

        // Init the points and iterate over each symbol
        let points: number = 0;
        for (let symbol of symbols) {
            // Iterate over each state split within the symbol and calculate the points
            for (let splitID of this.stateSplits) {
                points += this.calculatePointsForSplit(coins.csbs[symbol].ss[splitID].s);
            }
        }

        /**
         * Calculate the maximum possible points based on the number of 
         * splits that will be analyzed.
         */
        const maxPoints: number = symbols.length * this.stateSplits.length;
        const pointsShare: number = <number>this._utils.calculatePercentageOutOfTotal(points, maxPoints);

        // Finally, return the score
        return <number>this._utils.outputNumber((pointsShare / 100) * this.config.score_weights.volume);
    }





    /**
     * Calculates the points (0 - 1) for an individual state split.
     * @param splitState 
     * @returns number
     */
    private calculatePointsForSplit(splitState: IStateType): number {
        if      (splitState == 2) { return this.state.k == 1 ? 1: 0 }
        else if (splitState == 1) { return this.state.k == 1 ? 0.75: 0.25 }
        else if (splitState == 0) { return 0.5 }
        else if (splitState == -1) { return this.state.k == 1 ? 0.25: 0.75 }
        else if (splitState == -2) { return this.state.k == 1 ? 0: 1 }
    }










    /* Reversal Compliant Symbols */






    /**
     * When the score requirement is met and the event is being 
     * built, the list of symbols that reacted in favor of 
     * the reversal is built in order to be used by the signals
     * module.
     * @param coins
     * @returns string[]
     */
    private getEventCompliantSymbols(coins: ICoinsCompressedState): string[] {
        // Init the symbols
        let symbols: string[] = [];

        // Iterate over each symbol
        for (let symbol in this.state.ics) {
            /**
             * If the reversal originated from a support contact, include
             * the symbols which states increased.
             */
            if (this.state.k == 1) {
                if (coins.csbs[symbol].s > this.state.ics.csbs[symbol].s) {
                    symbols.push(symbol);
                }
            }

            /**
             * If the reversal originated from a resistance contact, include
             * the symbols which states decreased.
             */
            else {
                if (coins.csbs[symbol].s < this.state.ics.csbs[symbol].s) {
                    symbols.push(symbol);
                }
            }
        }

        // Finally, return the shuffled list of compliant symbols
        return symbols.map(value => ({ value, sort: Math.random() }))
                      .sort((a, b) => a.sort - b.sort)
                      .map(({ value }) => value);
    }














    /* State Calculation Misc Helpers */



    /**
     * Builds the default full state of the reversal module.
     * @returns IReversalState
     */
    private getDefaultFullState(): IReversalState {
        return {
            id: 0,
            end: undefined,
            k: 0,
            kze: null,
            av: 0,
            vg: 0,
            ics: { csbs: {}, cd: 0},
            ecs: null,
            fcs: null,
            scr: { g: [], v: [], l: [], c: [] },
            e: null
        }
    }


    





    /**
     * Retrieves the module's default state.
     * @returns IMinifiedReversalState
     */
    public getDefaultState(): IMinifiedReversalState {
        return {
            id: 0,
            k: 0,
            s: 0,
            e: null
        }
    }























    /*****************************
     * Reversal State Management *
     *****************************/






    /**
     * Retrieves a reversal event by ID. Checks the active state before
     * querying the db. Notice that if the state is not found, it will
     * throw an error.
     * @param id 
     * @returns Promise<IReversalState>
     */
    public async getReversalState(id: number): Promise<IReversalState> {
        // Validate the request
        if (!this._val.numberValid(id)) {
            throw new Error(this._utils.buildApiError(`The provided reversal id (${id}) is invalid.`, 37505));
        }

        // Check if the queried state is active
        if (this.state.id == id) { return this.state }

        // Otherwise, check the db
        else {
            // Retrieve the state
            const { rows } = await this._db.query({
                text: `SELECT data FROM  ${this._db.tn.reversal_states} WHERE id = $1`,
                values: [ id ]
            });

            // Ensure it was found
            if (!rows.length) {
                throw new Error(this._utils.buildApiError(`The provided reversal id (${id}) was not found in the database.`, 37506));
            }

            // Return the state
            return rows[0].data;
        }
    }







    /**
     * Saves a reversal state into the db.
     * @param state 
     * @returns Promise<void>
     */
    private async saveState(state: IReversalState): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.reversal_states}(id, data) VALUES($1, $2)`,
            values: [ state.id, state ]
        });
    }

























    /****************************
     * Configuration Management *
     ****************************/






    /**
     * Initializes the Reversal's Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: IReversalConfiguration|undefined = await this.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: IReversalConfiguration): Promise<void> {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided reversal config object is invalid.`, 37500));
        }
        if (!this._val.numberValid(newConfiguration.min_event_score, 10, 100)) {
            throw new Error(this._utils.buildApiError(`The provided min_event_score (${newConfiguration.min_event_score}) is invalid.`, 37501));
        }
        if (!newConfiguration.score_weights || typeof newConfiguration.score_weights != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided reversal score_weights object is invalid.`, 37502));
        }
        if (
            !this._val.numberValid(newConfiguration.score_weights.volume, 1, 100) ||
            !this._val.numberValid(newConfiguration.score_weights.liquidity, 1, 100) ||
            !this._val.numberValid(newConfiguration.score_weights.coins, 1, 100)
        ) {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided score weights object must contain valid numbers randing 1-100.`, 37503));
        }
        const weightsSum: number = newConfiguration.score_weights.volume + newConfiguration.score_weights.liquidity + newConfiguration.score_weights.coins;
        if (weightsSum != 100) {
            throw new Error(this._utils.buildApiError(`The sum of the weights must be equals to 100. Received: ${weightsSum}.`, 37504));
        }

        // Store the new config on the db and update the local property
        await this.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }











    /* Configuration Record Management */






    /**
     * Retrieves the Reversal's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IReversalConfiguration|undefined>
     */
    private async getConfigurationRecord(): Promise<IReversalConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.reversal_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Reversal's Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    private async createConfigurationRecord(defaultConfiguration: IReversalConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.reversal_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Reversal's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    private async updateConfigurationRecord(newConfiguration: IReversalConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.reversal_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }







    /* Misc Helpers */



    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns IReversalConfiguration
     */
    private buildDefaultConfig(): IReversalConfiguration {
        return {
            min_event_score: 70,
            score_weights: {
                volume: 10,
                liquidity: 30,
                coins: 60
            }
        }
    }
}