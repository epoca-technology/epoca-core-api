import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { ISplitStateID, IStateType } from "../_shared";
import { IVolumeStateIntensity } from "../volume";
import { IKeyZoneState } from "../keyzones";
import { ILiquidityState } from "../liquidity";
import { ICoinsCompressedState } from "../coins";
import { INotificationService } from "../../../notification";
import { IUtilitiesService } from "../../../utilities";
import {
    IMinifiedReversalState,
    IReversalCoinsStates,
    IReversalConfiguration,
    IReversalModel,
    IReversalService,
    IReversalState,
    IReversalValidations,
} from "./interfaces";




@injectable()
export class ReversalService implements IReversalService {
    // Inject dependencies
    @inject(SYMBOLS.ReversalModel)                      private _model: IReversalModel;
    @inject(SYMBOLS.ReversalValidations)                private _validations: IReversalValidations;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;
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
    private coinsStates: IReversalCoinsStates;
    private scoreRequirement: number;

    /**
     * Coin State Splits
     * The state splits that will be used in order to calculate the coins'
     * score.
     */
    private readonly stateSplits: ISplitStateID[] = [ "s15", "s10", "s5", "s2" ];


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
        this.coinsStates = this.getDefaultCoinsStates();
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
     * @param volume
     * @param keyzones
     * @param liquidity
     * @param coins
     * @param coinsBTC
     * @returns IMinifiedReversalState
     */
    public calculateState(
        volume: IVolumeStateIntensity,
        keyzones: IKeyZoneState, 
        liquidity: ILiquidityState, 
        coins: ICoinsCompressedState,
        coinsBTC: ICoinsCompressedState
    ): IMinifiedReversalState {
        /**
         * If there was an active state but a new keyzone event was generated, 
         * close the active and initialize the new one.
         */
        if (this.state.id != 0 && keyzones.event && this.state.id != keyzones.event.t) {
            this.onKeyZoneEventEnd(coins);
            this.onKeyZoneContactEvent(keyzones, coins);
        }

        // If there is a KeyZone Event but not a local reversal one, initialize it
        else if (this.state.id == 0 && keyzones.event) {
            this.onKeyZoneContactEvent(keyzones, coins);
        }

        // If there is a local reversal event but the KeyZone Event faded away, close it
        else if (this.state.id != 0 && !keyzones.event) {
            this.onKeyZoneEventEnd(coins);
        }

        // If there is a state, update it with the latest data
        if (this.state.id != 0) {
            this.onMarketStateChanges(volume, liquidity, coins, coinsBTC);
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
            scr: { g: [], v: [], l: [], c: [], cb: [] },
            e: null
        };
        this.coinsStates = {
            initial: coins,
            event: null,
            final: null
        };

        /**
         * Sets the score requirement for the reversal event to be issued based on its kind.
         * If it is a support reversal (1) it will make use of support_reversal_score_requirement.
         * A resistance reversal (-1) on the other hand, makes use of resistance_reversal_score_requirement.
         */
        this.scoreRequirement = this.state.k == 1 ? 
                this.config.support_reversal_score_requirement: 
                this.config.resistance_reversal_score_requirement;
    }








    /**
     * Triggers whenever the KeyZone event ends. Saves the state into the
     * database and resets all the values.
     */
    private onKeyZoneEventEnd(coins: ICoinsCompressedState): void {
        // Firstly, set the end and the final coins' states
        this.state.end = Date.now();
        this.coinsStates.final = coins;

        // Store the state in the db
        this._model.saveState(this.state, this.coinsStates);

        // Reset the values
        this.state = this.getDefaultFullState();
        this.coinsStates = this.getDefaultCoinsStates();
    }










    /**
     * Triggers whenever there is an active state and the market state
     * has changed. Updates the state and can issue signals if the 
     * configured requirements are met.
     * @param volume 
     * @param liquidity 
     * @param coins 
     * @param coinsBTC 
     */
    private onMarketStateChanges(
        volume: IVolumeStateIntensity, 
        liquidity: ILiquidityState, 
        coins: ICoinsCompressedState,
        coinsBTC: ICoinsCompressedState
    ): void {
        // Initialize the current score
        let currentScore: number = 0;

        // Calculate the volume score
        const volScore: number = this.calculateVolumeScore(volume);
        currentScore += volScore;

        // Calculate the liquidity score
        const liqScore: number = this.calculateLiquidityScore(liquidity);
        currentScore += liqScore;

        // Calculate the coins' score
        const coinsScore: number = this.calculateCoinsScore(coins, this.config.score_weights.coins);
        currentScore += coinsScore;

        // Calculate the coins' BTC score
        const coinsBTCScore: number = this.calculateCoinsScore(
            coinsBTC, 
            this.config.score_weights.coins_btc
        );
        currentScore += coinsBTCScore;

        // Set the new scores on the state
        currentScore = <number>this._utils.outputNumber(currentScore);
        this.state.scr.g.push(currentScore);
        this.state.scr.v.push(volScore);
        this.state.scr.l.push(liqScore);
        this.state.scr.c.push(coinsScore);
        this.state.scr.cb.push(coinsBTCScore);

        // If an event hasn't been issued and the score has met the requirements, issue it
        if (!this.state.e && currentScore >= this.scoreRequirement) {
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
                this.coinsStates.event = coins;

                // Send a notification
                this._notification.onReversalEvent(this.state.k, currentScore);
            }
        }
    }








    /* Score Calculations */



    




    /**
     * Calculates the volume's score based on its state.
     * @returns number
     */
    private calculateVolumeScore(volumeState: IVolumeStateIntensity): number {
        if      (volumeState == 3) { 
            return this.config.score_weights.volume 
        }
        else if (volumeState == 2) { 
            return <number>this._utils.outputNumber(this.config.score_weights.volume * 0.85) 
        }
        else if (volumeState == 1) { 
            return <number>this._utils.outputNumber(this.config.score_weights.volume * 0.6) 
        }
        else                       { 
            return 0 
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
     * @param weight 
     * @returns number
     */
    private calculateCoinsScore(coins: ICoinsCompressedState, weight: number): number {
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
        const pointsShare: number = <number>this._utils.calculatePercentageOutOfTotal(
            points, 
            maxPoints
        );

        // Finally, return the score
        return <number>this._utils.outputNumber((pointsShare / 100) * weight);
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
     * the reversal is built with the symbols sorted based on
     * the configuration.
     * @param coins
     * @returns string[]
     */
    private getEventCompliantSymbols(coins: ICoinsCompressedState): string[] {
        // Init the coins
        let compliantCoins: Array<{symbol: string, changeSum: number}> = [];

        // Iterate over each symbol
        for (let symbol in this.coinsStates.initial.csbs) {
            /**
             * If the reversal originated from a support contact, include
             * the symbols which states increased.
             */
            if (this.state.k == 1) {
                if (coins.csbs[symbol].s > this.coinsStates.initial.csbs[symbol].s) {
                    compliantCoins.push({
                        symbol: symbol,
                        changeSum: <number>this._utils.calculateSum(
                            this.stateSplits.map(
                                (ss) => this.coinsStates.initial.csbs[symbol].ss[ss].c
                            )
                        )
                    });
                }
            }

            /**
             * If the reversal originated from a resistance contact, include
             * the symbols which states decreased.
             */
            else {
                if (coins.csbs[symbol].s < this.coinsStates.initial.csbs[symbol].s) {
                    compliantCoins.push({
                        symbol: symbol,
                        changeSum: <number>this._utils.calculateSum(
                            this.stateSplits.map(
                                (ss) => this.coinsStates.initial.csbs[symbol].ss[ss].c
                            )
                        )
                    });
                }
            }
        }

        // If compliant coins were listed, sort them based on the configuration
        if (compliantCoins.length) {
            /**
             * Shuffle Sort Function
             * Sorts the compliant symbols in a fully random way.
             */
            if (this.config.event_sort_func == "SHUFFLE") {
                return compliantCoins.map(value => ({ value, sort: Math.random() }))
                                .sort((a, b) => a.sort - b.sort)
                                .map(({ value }) => value.symbol);
            }

            /**
             * Change Sum Sort Function
             * Sorts the compliant symbols based on the kind of reversal that is
             * taking place, as well as the change sum within the short dataset
             * splits.
             */
            else if (this.config.event_sort_func == "CHANGE_SUM") {
                // If it is reversing from a support, the higher the change sum the better
                if (this.state.k == 1) {
                    compliantCoins.sort((a, b) => (a.changeSum < b.changeSum) ? 1 : -1);
                }

                // If it is reversing from a resistance, the lower the change sum the better
                else {
                    compliantCoins.sort((a, b) => (a.changeSum > b.changeSum) ? 1 : -1);
                }

                // Finally, return the symbols
                return compliantCoins.map((c) => c.symbol);
            }

            // Otherwise, something is wrong
            else {
                console.log(this.config);
                throw new Error(this._utils.buildApiError(`The reversal compliant symbols could not be sorted because the function
                (${this.config.event_sort_func}) is invalid.`, 37508));
            }
        }

        // Otherwise, there should not be a reversal event
        else { return [] }
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
            scr: { g: [], v: [], l: [], c: [], cb: [] },
            e: null
        }
    }





    /**
     * Builds the default coins states object.
     * @returns 
     */
    private getDefaultCoinsStates(): IReversalCoinsStates {
        return {
            initial: {csbs: {}, cd: 0},
            event: null,
            final: null
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
        this._validations.validateReversalID(id);

        // Check if the queried state is active
        if (this.state.id == id) { return this.state }

        // Otherwise, check the db
        else {
            return await this._model.getReversalState(id);
        }
    }






    /**
     * Retrieves a reversal coins states by ID. Checks the active state before
     * querying the db. Notice that if the state is not found, it will
     * throw an error.
     * @param id 
     * @returns Promise<IReversalCoinsStates>
     */
    public async getReversalCoinsStates(id: number): Promise<IReversalCoinsStates> {
        // Validate the request
        this._validations.validateReversalID(id);

        // Check if the queried state is active
        if (this.state.id == id) { return this.coinsStates }

        // Otherwise, check the db
        else {
            return await this._model.getReversalCoinsStates(id);
        }
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
        const config: IReversalConfiguration|undefined = await this._model.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this._model.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Reversal's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: IReversalConfiguration): Promise<void> {
        // Validate the request
        this._validations.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this._model.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }






    /**
     * Builds the default configuration object in order of the db record to be initialized.
     * @returns IReversalConfiguration
     */
    private buildDefaultConfig(): IReversalConfiguration {
        return {
            support_reversal_score_requirement: 78,
            resistance_reversal_score_requirement: 70,
            event_sort_func: "CHANGE_SUM",
            score_weights: {
                volume: 5,
                liquidity: 30,
                coins: 35,
                coins_btc: 30
            }
        }
    }
}