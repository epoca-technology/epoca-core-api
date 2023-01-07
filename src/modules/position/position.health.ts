import {inject, injectable} from "inversify";
import { Subscription } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IPrediction } from "../epoch-builder";
import { IPredictionService } from "../prediction";
import { IMarketState, IMarketStateService, ITAIntervalID } from "../market-state";
import { IBinancePositionSide } from "../binance";
import { IUtilitiesService } from "../utilities";
import { 
    IPositionHealth,
    IPositionModel,
    IPositionSideHealth,
    IPositionHealthState,
    IPositionHealthWeights,
    IActivePosition
} from "./interfaces";




@injectable()
export class PositionHealth implements IPositionHealth {
    // Inject dependencies
    @inject(SYMBOLS.PredictionService)          private _prediction: IPredictionService;
    @inject(SYMBOLS.MarketStateService)         private _marketState: IMarketStateService;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;


    /**
     * Position Health Weights
     * The weights used by each module in order to calculate the 
     * position's health points.
     */
    private readonly weights: IPositionHealthWeights = {
        trend_sum: 77,
        trend_state: 5,
        ta_30m: 1,
        ta_2h: 2,
        ta_4h: 2,
        ta_1d: 3,
        open_interest: 5,
        long_short_ratio: 5
    }


    /**
     * Long Position Health
     * The active long position's health, if none is, this value is undefined.
     */
    public long: IPositionSideHealth|null = null;



    /**
     * Short Position Health
     * The active short position's health, if none is, this value is undefined.
     */
    public short: IPositionSideHealth|null = null;


    /**
     * Prediction Stream
     * Real time connection to the predictions generated by the PredictionModel.
     */
    private pred: IPrediction|undefined;
    private predSub: Subscription;


    /**
     * Market State Stream
     * Real time connection to the current market state.
     */
    private ms: IMarketState;
    private msSub: Subscription;





    constructor() {}










    /***************
     * Initializer * 
     ***************/





    /**
     * Initializes the Position Health Module.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Subscribe the to prediction stream
        this.predSub = this._prediction.active.subscribe((pred: IPrediction|undefined) => {
            this.pred = pred;
        });

        // Subscribe to the market state stream
        this.msSub = this._marketState.active.subscribe((ms: IMarketState) => {
            this.ms = ms;
        });

        // Initialize the stored health
        const health: IPositionHealthState|undefined = await this._model.getHealth();
        if (health) {
            this.long = health.long;
            this.short = health.short;
        } else {
            await this._model.createHealth({long: this.long, short: this.short});
        }
    }




    /**
     * Stops the subscriptions too all the external modules.
     */
    public stop(): void {
        if (this.predSub) this.predSub.unsubscribe();
        if (this.msSub) this.msSub.unsubscribe();
    }


    












    /******************************
     * Position Health Calculator *
     ******************************/









    /**
     * Calculates the health for all active positions.
     * @param long 
     * @param short 
     * @returns Promise<void>
     */
    public async onPositionRefresh(
        long: IActivePosition|undefined,
        short: IActivePosition|undefined
    ): Promise<void> {
        // Make sure the prediction and the market state are properly set
        if (!this.pred) {
            console.log(this.pred);
            throw new Error(this._utils.buildApiError(`The position health could not be calculated because the 
            prediction model is not currently active.`, 32000));
        }
        if (!this.ms) {
            console.log(this.ms);
            throw new Error(this._utils.buildApiError(`The position health could not be calculated because the 
            market state is not currently active.`, 32001));
        }

        // Evaluate the long position (if any)
        if (long) {
            this.long = this.calculateHealth("LONG");
        } else { this.long = null }

        // Evaluate the short position (if any)
        if (short) {
            this.short = this.calculateHealth("SHORT");
        } else { this.short = null }

        // Finally, update the state on the db
        await this.onHealthChanges();
    }







    /**
     * Creates or updates the health for a position side.
     * @param side 
     * @returns IPositionSideHealth
     */
    private calculateHealth(side: IBinancePositionSide): IPositionSideHealth {
        // Firstly, initialize the side's health in case it hasn't been
        let health: IPositionSideHealth|null = side == "LONG" ? this.long: this.short;
        if (!health) {
            health = {
                os: this.pred.s,
                ohp: 0,
                hhp: 0,
                lhp: 0,
                chp: 0,
                dd: 0,
                ts: Date.now()
            }
        }

        // Init the health points
        let hp: number = 0;

        // Evaluate the trend sum
        hp += this.evaluateTrendSum(side, health.os);

        // Evaluate the trend state
        hp += this.evaluateTrendState(side);

        // Evaluate the TA
        hp += this.evaluateTechnicalAnalysis(side, "30m"); 
        hp += this.evaluateTechnicalAnalysis(side, "2h"); 
        hp += this.evaluateTechnicalAnalysis(side, "4h"); 
        hp += this.evaluateTechnicalAnalysis(side, "1d"); 

        // Evaluate the open interest
        hp += this.evaluateOpenInterest(side);

        // Evaluate the long/short ratio
        hp += this.evaluateLongShortRatio(side);

        // Format the HP correctly
        hp = <number>this._utils.outputNumber(hp);

        // Complete the health object if it was partially initialized
        if (health.ohp == 0) {
            health.ohp = hp;
            health.hhp = hp;
            health.lhp = hp;
            health.chp = hp;
        }

        // Otherwise, update the health point related properties
        else {
            health.hhp = hp > health.hhp ? hp: health.hhp;
            health.lhp = hp < health.lhp ? hp: health.lhp;
            health.chp = hp;
        }

        /**
         * For there to be a drawdown, the current health must be less than the highest.
         * Otherwise, the drawdown is equals to 0.
         */
        if (health.hhp > health.chp) {
            health.dd = <number>this._utils.calculatePercentageChange(health.hhp, health.chp);
        } else { health.dd = 0 }

        // Finally, return the current health
        return health;
    }





    /**
     * Calculates the prediction HP based on the initial and the current
     * sum.
     * @param side 
     * @param openSum 
     * @returns number
     */
    private evaluateTrendSum(side: IBinancePositionSide, openSum: number): number {
        // Init the score
        let score: number = 0.5;

        // Evaluate a trend sum that is increasing
        if (this.pred.s > openSum) {
            const alterMultiplier: number = openSum > 0 ? 1: -1;
            if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 95*alterMultiplier)) {
                score = side == "LONG" ? 1: 0;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 85*alterMultiplier)) {
                score = side == "LONG" ? 0.95: 0.05;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 75*alterMultiplier)) {
                score = side == "LONG" ? 0.9: 0.1;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 65*alterMultiplier)) {
                score = side == "LONG" ? 0.85: 0.15;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 55*alterMultiplier)) {
                score = side == "LONG" ? 0.8: 0.2;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 50*alterMultiplier)) {
                score = side == "LONG" ? 0.75: 0.25;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 45*alterMultiplier)) {
                score = side == "LONG" ? 0.7: 0.3;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 30*alterMultiplier)) {
                score = side == "LONG" ? 0.65: 0.35;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 15*alterMultiplier)) {
                score = side == "LONG" ? 0.6: 0.4;
            } else if (this.pred.s >= this._utils.alterNumberByPercentage(openSum, 5*alterMultiplier)) {
                score = side == "LONG" ? 0.55: 0.45;
            }
        }

        // Evaluate a trend sum that is decreasing
        else if (this.pred.s < openSum) {
            const alterMultiplier: number = openSum < 0 ? 1: -1;
            if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 95*alterMultiplier)) {
                score = side == "SHORT" ? 1: 0;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 85*alterMultiplier)) {
                score = side == "SHORT" ? 0.95: 0.05;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 75*alterMultiplier)) {
                score = side == "SHORT" ? 0.9: 0.1;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 65*alterMultiplier)) {
                score = side == "SHORT" ? 0.85: 0.15;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 55*alterMultiplier)) {
                score = side == "SHORT" ? 0.8: 0.2;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 50*alterMultiplier)) {
                score = side == "SHORT" ? 0.75: 0.25;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 45*alterMultiplier)) {
                score = side == "SHORT" ? 0.7: 0.3;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 30*alterMultiplier)) {
                score = side == "SHORT" ? 0.65: 0.35;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 15*alterMultiplier)) {
                score = side == "SHORT" ? 0.6: 0.4;
            } else if (this.pred.s <= this._utils.alterNumberByPercentage(openSum, 5*alterMultiplier)) {
                score = side == "SHORT" ? 0.55: 0.45;
            }
        }

        // Finally, return the score
        return this.weights.trend_sum * score;
    }





    /**
     * Calculates the prediction state HP based on the current state and side.
     * @param side 
     * @returns number
     */
    private evaluateTrendState(side: IBinancePositionSide): number {
        // Init the score
        let score: number = 0.5;

        // Evaluate an increasing trend state
        if (this._prediction.activeState >= 9) {
            score = side == "LONG" ? 1: 0;
        } else if (this._prediction.activeState == 8) {
            score = side == "LONG" ? 0.95: 0.1;
        } else if (this._prediction.activeState == 7) {
            score = side == "LONG" ? 0.9: 0.15;
        } else if (this._prediction.activeState == 6) {
            score = side == "LONG" ? 0.85: 0.2;
        } else if (this._prediction.activeState == 5) {
            score = side == "LONG" ? 0.8: 0.25;
        } else if (this._prediction.activeState == 4) {
            score = side == "LONG" ? 0.75: 0.3;
        } else if (this._prediction.activeState == 3) {
            score = side == "LONG" ? 0.7: 0.35;
        } else if (this._prediction.activeState == 2) {
            score = side == "LONG" ? 0.65: 0.4;
        } else if (this._prediction.activeState == 1) {
            score = side == "LONG" ? 0.6: 0.45;
        }

        // Evaluate a decreasing trend state
        else if (this._prediction.activeState == -1) {
            score = side == "SHORT" ? 0.6: 0.45;
        } else if (this._prediction.activeState == -2) {
            score = side == "SHORT" ? 0.65: 0.4;
        } else if (this._prediction.activeState == -3) {
            score = side == "SHORT" ? 0.7: 0.35;
        } else if (this._prediction.activeState == -4) {
            score = side == "SHORT" ? 0.75: 0.3;
        } else if (this._prediction.activeState == -5) {
            score = side == "SHORT" ? 0.8: 0.25;
        } else if (this._prediction.activeState == -6) {
            score = side == "SHORT" ? 0.85: 0.2;
        } else if (this._prediction.activeState == -7) {
            score = side == "SHORT" ? 0.9: 0.15;
        } else if (this._prediction.activeState == -8) {
            score = side == "SHORT" ? 0.95: 0.1;
        } else if (this._prediction.activeState <= -9) {
            score = side == "SHORT" ? 1: 0;
        }

        // Finally, return the score
        return this.weights.trend_state * score;
    }





    /**
     * Calculates the technical analysis HP based on the current state.
     * @param side 
     * @returns number
     */
    private evaluateTechnicalAnalysis(side: IBinancePositionSide, taInterval: ITAIntervalID): number {
        // Init the score
        let score: number = 0.5;

        // Evaluate the current state score based on the side
        if (this.ms.technical_analysis[taInterval].s.a == "STRONG_SELL") {
            score = side == "SHORT" ? 1: 0
        } else if (this.ms.technical_analysis[taInterval].s.a == "SELL") {
            score = side == "SHORT" ? 0.75: 0.25
        } else if (this.ms.technical_analysis[taInterval].s.a == "BUY") {
            score = side == "LONG" ? 0.75: 0.25
        } else if (this.ms.technical_analysis[taInterval].s.a == "STRONG_BUY") {
            score = side == "LONG" ? 1: 0
        }

        // Finally, return the score
        return this.weights[`ta_${taInterval}`] * score;
    }






    /**
     * Calculates the open interest HP based on the current state.
     * @param side 
     * @returns number
     */
    private evaluateOpenInterest(side: IBinancePositionSide): number {
        // Init the score
        let score: number = 0.5;

        // Evaluate the current state score based on the side
        if (this.ms.open_interest.state == "increasing") {
            score = side == "LONG" ? 1: 0
        } else if (this.ms.open_interest.state == "decreasing") {
            score = side == "SHORT" ? 1: 0
        }

        // Finally, return the score
        return this.weights.open_interest * score;
    }
    



    /**
     * Calculates the long short ratio HP based on the current state.
     * @param side 
     * @returns number
     */
    private evaluateLongShortRatio(side: IBinancePositionSide): number {
        // Init the score
        let score: number = 0.5;

        // Evaluate the current state score based on the side
        if (this.ms.long_short_ratio.state == "increasing") {
            score = side == "LONG" ? 1: 0
        } else if (this.ms.long_short_ratio.state == "decreasing") {
            score = side == "SHORT" ? 1: 0
        }

        // Finally, return the score
        return this.weights.long_short_ratio * score;
    }










    /****************
     * Misc Helpers *
     ****************/





    /**
     * Whenever the any of the side's health experiences
     * a change, it is also updated in the db.
     * @returns Promise<void>
     */
    private onHealthChanges(): Promise<void> {
        return this._model.updateHealth({long: this.long, short: this.short});
    }
}
