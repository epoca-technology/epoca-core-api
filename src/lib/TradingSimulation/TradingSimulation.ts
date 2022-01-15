import {appContainer, SYMBOLS} from "../../ioc";
import { ICandlestick } from "../../modules/candlestick";
import { BalanceSimulation } from "./BalanceSimulation";
import { 
    ITendencyForecastRequired, 
    ITradingSimulation,
    ITradingSimulationConfig, 
    ITradingSimulationPosition, 
    ITradingSimulationResult,
    IBalanceSimulation,
    IPositionExitParameters
} from "./interfaces";
import {BigNumber} from "bignumber.js";
import * as moment from 'moment';




// Init Utilities Service
import { IUtilitiesService } from "../../../src/modules/shared/utilities";
const _utils: IUtilitiesService = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);

// Init Forecast Service
import { IForecastService, IForecastPosition, IForecast } from "../../modules/shared/forecast";
const _forecast: IForecastService = appContainer.get<IForecastService>(SYMBOLS.ForecastService);



export class TradingSimulation implements ITradingSimulation {
    // Core Properties

    /**
     * @series
     * The entire list of candles to be simulated.
     * DEFAULT: 150
     */
    private readonly series: ICandlestick[];


    /**
     * @processingSeries
     * The specific chunk of series that's currently active based on the windows size.
     */
    private processingSeries: ICandlestick[];




    // Balance Class
    private readonly balance: IBalanceSimulation;


    /**
     * @windowSize
     * The amount of candles that will analyze in order to perform forecasting. 
     * This is also the window that the trading simulator will adapt automatically
     * upon new candles.
     * Example: if there are 100 candles and the window size is 30, it will use the 
     * first 30 records to analyze the potential forecast and will attempt to trade on
     * candle 31. As the trading moves along, it adds new candles to the processing list
     * and removes the old ones in order to preserve the window.
     * DEFAULT: 30
     */
    private readonly windowSize: number = 30;


    /**
     * @tendencyForecastRequired
     * The requirement for the simulation to open positions.
     * DEFAULT: {long: 1, short: -1}
     */
    private readonly tendencyForecastRequired: ITendencyForecastRequired = {long: 1, short: -1};


    /**
     * @meditationMinutes
     * This represents the number of minutes the trading simulation will wait until opening a 
     * position after having closed one.
     * DEFAULT: 60
     * 
     * @meditationEnds
     * This timestamp indicates the end of a meditation. It adds the @meditationMinutes to the 
     * close timestamp from the candle which closed a position. 
     * 
     * @whileMeditating
     * This counter represents the number of times the trading simulation did not take an 
     * action because of the meditation period.
     */
    private readonly meditationMinutes: number = 60;
    private meditationEnds: number|undefined;
    private whileMeditating: number = 0;



    /**
     * Positions:
     * @activePosition  -> The position that is currently open. Once closed, this property is set to undefined
     * @positions       -> The list of positions that have been open and closed
     */
    private activePosition: ITradingSimulationPosition|undefined;
    private positions: ITradingSimulationPosition[] = [];



    /**
     * Summary Counters: 
     * @successful     -> Successful Position
     * @unsuccessful   -> Unsuccessful Position
     */
    private successful: number = 0;
    private unsuccessful: number = 0;


    /**
     * Longs Counters:
     * @longsTotal
     * @successfulLongs
     * @unsuccessfulLongs
     */
    private longsTotal: number = 0;
    private successfulLongs: number = 0;
    private unsuccessfulLongs: number = 0;


    /**
     * Shorts Counters:
     * @shortsTotal
     * @successfulShorts
     * @unsuccessfulShorts
     */
    private shortsTotal: number = 0;
    private successfulShorts: number = 0;
    private unsuccessfulShorts: number = 0;



    /**
     * @neutral
     * This is the number of times the simulation chose to not open a new position based on decision factors.
     */
    private neutral: number = 0;





    /**
     * @verbose
     * Displays additional data of the process for debugging purposes.
     * DEFAULT: 0
     */
    private readonly verbose: number = 0;




    constructor(config: ITradingSimulationConfig) {
        // Set core properties
        this.series = config.series;
        if (config.windowSize) this.windowSize = config.windowSize;
        if (config.tendencyForecastRequired) this.tendencyForecastRequired = config.tendencyForecastRequired;
        if (typeof config.meditationMinutes == "number") this.meditationMinutes = config.meditationMinutes;
        if (typeof config.verbose == "number") this.verbose = config.verbose;

        // Initialize the processing series
        this.processingSeries = this.series.slice(0, this.windowSize);

        // Initialize the balance
        this.balance = new BalanceSimulation(config.balanceConfig);
    }







    /**
     * Runs the simulation based on the config and returns the results.
     * @returns Promise<ITradingSimulationResult>
     */
    public async run(): Promise<ITradingSimulationResult> {
        // Generate the simulation id
        const id: string = this.generateID();

        // Initialize the start time of the simulation
        const start: number = Date.now();

        // Log init - if verbose
        if (this.verbose > 0) this.displayInit(id);

        // Execute the simulation
        await this.executeSimulation();

        // Build the results
        const end: number = Date.now();
        const result: ITradingSimulationResult = {
            // ID
            id: id,

            // Period
            periodBegins: this.series[this.windowSize].ot,
            periodEnds: this.series[this.series.length - 1].ct,

            // Positions
            positions: this.positions,

            // Summary Counters
            successful: this.successful,
            unsuccessful: this.unsuccessful,
            neutral: this.neutral,
            whileMeditating: this.whileMeditating,
            successRate: <number>_utils.calculatePercentageOutOfTotal(this.successful, this.positions.length),

            /* Balance */

            // Summary
            initialBalance: this.balance.initial,
            currentBalance: this.balance.current,
            bank: this.balance.bank.toNumber(),
            profit: this.balance.bank.plus(this.balance.current).minus(this.balance.initial).toNumber(),

            // Fees
            netFee: this.balance.fees.netFee.toNumber(),
            openTradeFee: this.balance.fees.openTradeFee.toNumber(),
            closeTradeFee: this.balance.fees.closeTradeFee.toNumber(),


            // Long Counters
            longsTotal: this.longsTotal,
            successfulLongs: this.successfulLongs,
            unsuccessfulLongs: this.unsuccessfulLongs,
            longSuccessRate: <number>_utils.calculatePercentageOutOfTotal(this.successfulLongs, this.longsTotal),

            // Short Counters
            shortsTotal: this.shortsTotal,
            successfulShorts: this.successfulShorts,
            unsuccessfulShorts: this.unsuccessfulShorts,
            shortSuccessRate: <number>_utils.calculatePercentageOutOfTotal(this.successfulShorts, this.shortsTotal),

            // Times
            start: start,
            end: end,
            duration: this.getSimulationDuration(start, end)
        }

        // Log results - if verbose
        //if (this.verbose > 0) this.displayResult(result);
        this.displayResult(result);

        // Return the final results
        return result;
    }








    /**
     * Initializes the data collection and the simulation.
     * @returns void
     */
    private async executeSimulation(): Promise<void> {
        // Iterates over each item in the series based on the window
        for (let i = this.windowSize; i < this.series.length; i++) {
            // Init the current item
            const currentItem: ICandlestick = this.series[i];

            // If it isn't the last time, handle the current item accordingly
            if (i < this.series.length - 1) {
                // Check the position state
                if (this.activePosition) { this.checkPositionState(currentItem) } 
                
                // Check if it is meditating
                else if (this.isMeditating(currentItem.ot)){ 
                    // Log info if applies
                    if (this.verbose > 1) this.displayIgnoredWhileMeditating(currentItem.ot, currentItem.ct);

                    // Increment the counter
                    this.whileMeditating += 1
                }

                // Based on the forecast decision, open a position if applies
                else {
                    // Retrieve the forecast
                    let forecast: IForecast = await _forecast.forecast(this.processingSeries.at(-1).ct);

                    // Check if a position can be opened
                    if (this.canOpenPosition(forecast.position)) { 
                        this.openPosition(forecast, currentItem) 
                    }

                    // Otherwise, stand neutral
                    else {
                        // Log info if applies
                        if (this.verbose > 1) this.displayStandingNeutral(currentItem, forecast);

                        // Increment Counter
                        this.neutral += 1;
                    }
                }

                /**
                 * Adjust the processing window so it moves up one space.
                 */
                this.processingSeries.push(currentItem);    // Add the new item
                this.processingSeries = this.processingSeries.slice(1, this.windowSize + 1); // Remove the first item
            } 
            
            // On the last item, close any position that's open regardless of the output.
            else if (this.activePosition) {
                // Log info
                if (this.verbose > 1) this.displayEndOfSeriesWithActivePosition();

                // Close position
                this.checkPositionState(currentItem, true);
            }
        }
    }






    










    /* Position Management */





    /**
     * Opens a short or a long position based on the forecast result. Once processed, it will also
     * check the state of the position for the current period.
     * @param forecast 
     * @param currentItem 
     * @returns void
     */
    private openPosition(forecast: IForecast, currentItem: ICandlestick): void {
        // Retrieve the exit parameters
        const ep: IPositionExitParameters = this.balance.getPositionExitParameters();

        // Activate the position
        this.activePosition = {
            //state: true,
            type: forecast.position > 0 ? 'long': 'short',
            forecast: forecast,
            openTime: currentItem.ot,
            openPrice: <number>_utils.outputNumber(currentItem.o, {dp: 2}),
            takeProfitPrice: forecast.position > 0 ? <number>_utils.alterNumberByPercentage(currentItem.o, ep.takeProfit): <number>_utils.alterNumberByPercentage(currentItem.o, -(ep.takeProfit)),
            stopLossPrice: forecast.position > 0 ? <number>_utils.alterNumberByPercentage(currentItem.o, -(ep.stopLoss)): <number>_utils.alterNumberByPercentage(currentItem.o, ep.stopLoss),
        };

        // Increment the counter
        if (forecast.position > 0) { this.longsTotal += 1 } else { this.shortsTotal += 1 };

        // Log info if applies
        if (this.verbose > 0) this.displayOpenPosition(this.activePosition);

        /**
         * Make sure the position remains open in the given period. It is possible for the price to 
         * fluctuate within the period and hit the takeProfit or stopLoss price.
         */
        this.checkPositionState(currentItem);
    }











    /**
     * Checks if the current position should be closed based on the current item.
     * If the forcePositionClose flag is passed, it will close the position no 
     * matter the outcome.
     * @param currentItem 
     * @param forcePositionClose? 
     * @returns void
     */
    private checkPositionState(currentItem: ICandlestick, forcePositionClose?: boolean): void {
        // Check the long position state
        if (this.activePosition.type == 'long') {
            // Check if the position has to be closed forcefully
            if (forcePositionClose) {
                // Init the closing price
                const closePrice: BigNumber = new BigNumber(currentItem.c);

                // Close the position
                this.closePosition(closePrice.toNumber(), closePrice.isGreaterThan(this.activePosition.openPrice), currentItem.ct);
            }

            // Otherwise, check if any of the condicitions has been met
            else {
                // Init the high and the low
                const high: BigNumber = new BigNumber(currentItem.h);
                const low: BigNumber = new BigNumber(currentItem.l);

                // Check if the SL Price was hit by the low
                if (low.isLessThanOrEqualTo(this.activePosition.stopLossPrice)) {
                    this.closePosition(this.activePosition.stopLossPrice, false, currentItem.ct);
                }
                
                
                // Check if the TP Price was hit by the high
                else if (high.isGreaterThanOrEqualTo(this.activePosition.takeProfitPrice)) {
                    this.closePosition(this.activePosition.takeProfitPrice, true, currentItem.ct);
                }


                // No actions need to be taken - Log if applies
                else {
                    if (this.verbose > 1) this.displayActionlessStateCheck(currentItem);
                }
            }
        } 
        
        // Check the short position state
        else {
            // Check if the position has to be closed forcefully
            if (forcePositionClose) {
                // Init the closing price
                const closePrice: BigNumber = new BigNumber(currentItem.c);

                // Close the position
                this.closePosition(closePrice.toNumber(), closePrice.isLessThan(this.activePosition.openPrice), currentItem.ct);
            }

            // Otherwise, check if any of the condicitions has been met
            else {
                // Init the high and the low
                const high: BigNumber = new BigNumber(currentItem.h);
                const low: BigNumber = new BigNumber(currentItem.l);

                // Check if the SL Price was hit by the high
                if (high.isGreaterThanOrEqualTo(this.activePosition.stopLossPrice)) {
                    this.closePosition(this.activePosition.stopLossPrice, false, currentItem.ct);
                }


                // Check if the TP Price was hit by the low
                else if (low.isLessThanOrEqualTo(this.activePosition.takeProfitPrice)) {
                    this.closePosition(this.activePosition.takeProfitPrice, true, currentItem.ct);
                }


                // No actions need to be taken - Log if applies
                else {
                    if (this.verbose > 1) this.displayActionlessStateCheck(currentItem);
                }
            }
        }
    }






    /**
     * If conditions have been met, it will close the active position.
     * @param closePrice 
     * @param outcome 
     * @param closeTime 
     * @returns void
     */
    private closePosition(closePrice: number, outcome: boolean, closeTime: number): void {
        // Complete the position before recording it
        this.activePosition.closeTime = closeTime;
        this.activePosition.closePrice = closePrice;
        this.activePosition.outcome = outcome;

        // Add it to the list of positions
        this.positions.push(this.activePosition);

        // Update counters based on type and outcome
        if (outcome) {
            // Update general counters
            this.successful += 1;

            // Update specific type counters
            if (this.activePosition.type == 'long') {
                this.successfulLongs += 1;
            } else {
                this.successfulShorts += 1;
            }
        } else {
            // Update general counters
            this.unsuccessful += 1;

            // Update specific type counters
            if (this.activePosition.type == 'long') {
                this.unsuccessfulLongs += 1;
            } else {
                this.unsuccessfulShorts += 1;
            }
        }

        // Log it if applies
        if (this.verbose > 0) this.displayClosePosition(this.activePosition);

        // Perform Balance Action
        this.balance.onPositionClose(this.activePosition);

        // Remove the active position
        this.activePosition = undefined;

        // Activate meditation
        this.activateMeditation(closeTime);
    }








    /**
     * Based on the forecast result, it verifies if a position can be opened.
     * @param forecastResult 
     * @returns returns boolean
     */
    private canOpenPosition(forecastResult: IForecastPosition): boolean {
        // If it is equals or greater than the long requirement it can open a position.
        if (forecastResult >= this.tendencyForecastRequired.long) {
            return true;
        }

        // if it is equals or smaller than the short requirement it can open a position.
        else if (forecastResult <= this.tendencyForecastRequired.short) {
            return true;
        }

        // Stand Neutral
        else {
            return false;
        }
    }










    /* Meditation */





    /**
     * Verifies if the simulation is currently meditating.
     * @param openTimestamp
     * @returns boolean
     */
    private isMeditating(openTimestamp: number): boolean {
        return typeof this.meditationEnds == "number" && openTimestamp < this.meditationEnds;
    }






    /**
     * Puts the simulation into meditation on position close.
     * @param closeTimestamp 
     * @param extended? 
     * @returns void
     */
    private activateMeditation(closeTimestamp: number, extended? : boolean): void {
        if (extended) {
            this.meditationEnds = moment(closeTimestamp).add(this.meditationMinutes*10, "minutes").valueOf();
        } else {
            this.meditationEnds = moment(closeTimestamp).add(this.meditationMinutes, "minutes").valueOf();
        }
    }














    /* Misc Helpers */






    /**
     * Retrieves a random ID for the simulation.
     * @IMPORTANT This functionality should be replaced by a Firebase Key in the future.
     * @returns string
     */
    private generateID(): string {
        let result: string = '';
        const characters: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
        for ( let i = 0; i < 10; i++ ) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }










    /**
     * Retrieves the duration of the simulation in seconds.
     * @param start 
     * @param end 
     * @returns number
     */
    private getSimulationDuration(start: number, end: number): number {
        //return _utils.roundNumber(new BigNumber(end).minus(start).dividedBy(1000), 0, true);
        return <number>_utils.outputNumber(new BigNumber(end).minus(start).dividedBy(1000), {
            dp: 0,
            ru: true
        });
    }
















    /* Verbose */



    /**
     * Displays the initialization of the simulation
     * @param id 
     * @returns void
     */
    private displayInit(id: string): void {
        console.log(' ');console.log(' ');
        console.log(`Trading Simulation: ${id}`);
        console.log(`Initial Series (${this.processingSeries.length}):`);
        for (let s of this.processingSeries) { console.log(`${_utils.toDateString(s.ct)} | ${s.c}`); }
        console.log(' ');console.log(' ');
    }





    /**
     * Displays the period that was ignored due to meditation state.
     * @param openTimestamp 
     * @param closeTimestamp 
     * @returns void
     */
    private displayIgnoredWhileMeditating(openTimestamp: number, closeTimestamp: number): void {
        console.log(`Ignored while meditating: ${_utils.toDateString(openTimestamp)} - ${_utils.toDateString(closeTimestamp)}`);
    }






    /**
     * Displays the period in which it stood neutral.
     * @param item 
     * @param forecastResult 
     * @returns void
     */
    private displayStandingNeutral(item: ICandlestick, forecastResult: IForecast): void {
        console.log(`Neutral on period: ${_utils.toDateString(item.ot)} - ${_utils.toDateString(item.ct)}`);
        //console.log(`Forecast: ${_utils.toDateString(item[0])} - ${_utils.toDateString(item[6])}`);
        //console.log(forecastResult);
    }





    /**
     * Notifies that the end of the series has been reached with an active position.
     * The simulator will force a close with the last candle's close price.
     */
    private displayEndOfSeriesWithActivePosition(): void {
        console.log('Reached the end of the series with an active position. Preparing to close it with the last close price.');
    }


    

    
    /**
     * Displays a position that has just been opened.
     * @param position 
     * @returns void
     */
    private displayOpenPosition(position: ITradingSimulationPosition): void {
        console.log(' ');
        console.log(`${position.type.toUpperCase()} Position Opened:`);
        console.log(`O: ${position.openPrice} | TP: ${position.takeProfitPrice} | SL ${position.stopLossPrice}`);
        /*console.log('Forecast:');
        console.log(position.forecast);*/
    }







    /**
     * Displays a position that has just been closed.
     * @param position 
     * @returns void
     */
    private displayClosePosition(position: ITradingSimulationPosition): void {
        console.log(`${position.outcome ? 'SUCCESSFUL': 'UNSUCCESSFUL'} ${position.type.toUpperCase()} Position Closed:`);
        console.log(`${_utils.toDateString(position.openTime)} - ${_utils.toDateString(position.closeTime)}`);
        console.log(`O: ${position.openPrice} | TP: ${position.takeProfitPrice} | SL: ${position.stopLossPrice}`);
        console.log(`Close Price: ${position.closePrice}`);
        console.log(' ');
    }







    /**
     * Displays an actionless state check.
     * @param currentItem 
     * @returns void
     */
    private displayActionlessStateCheck(currentItem: ICandlestick): void {
        console.log(`Actionless Check: ${_utils.toDateString(currentItem.ot)} - ${_utils.toDateString(currentItem.ct)}`);
        console.log(`O: ${currentItem.o} | H: ${currentItem.h} | L: ${currentItem.l} | C: ${currentItem.c}`);
    }







    /**
     * Displays the simulation result
     * @param r 
     * @returns void
     */
    private displayResult(r: ITradingSimulationResult): void {
        console.log(' ');console.log(' ');
        console.log('SUMMARY');
        console.log(`Period: ${_utils.toDateString(r.periodBegins)} - ${_utils.toDateString(r.periodEnds)}`);
        console.log(`Positions: ${r.positions.length}`);
        console.log(`Successful: ${r.successful}`);
        console.log(`Unsuccessful: ${r.unsuccessful}`);
        console.log(`Success Rate: ${r.successRate}%`);

        console.log(' ');

        console.log('BALANCE');
        console.log(`Initial: $${r.initialBalance}`);
        console.log(`Current: $${r.currentBalance}`);
        console.log(`Bank: $${r.bank}`);
        console.log(`Profit: $${r.profit}`);

        console.log(' ');

        console.log('LONGS');
        console.log(`Total: ${r.longsTotal}`);
        console.log(`Successful: ${r.successfulLongs}`);
        console.log(`Unsuccessful: ${r.unsuccessfulLongs}`);
        console.log(`Success Rate: ${r.longSuccessRate}%`);

        console.log(' ');

        console.log('SHORTS');
        console.log(`Total: ${r.shortsTotal}`);
        console.log(`Successful: ${r.successfulShorts}`);
        console.log(`Unsuccessful: ${r.unsuccessfulShorts}`);
        console.log(`Success Rate: ${r.shortSuccessRate}%`);

        console.log(' ');

        console.log('FEES');
        console.log(`Net: $${r.netFee}`);
        console.log(`Open Trade: $${r.openTradeFee}`);
        console.log(`Close Trade: $${r.closeTradeFee}`);

        console.log(' ');

        console.log('ACTIONLESS');
        console.log(`Neutral: ${r.neutral}`);
        console.log(`While Meditating: ${r.whileMeditating}`);

        console.log(' ');

        console.log('SIMULATION TIMES');
        console.log(`Start: ${_utils.toDateString(r.start)}`);
        console.log(`End: ${_utils.toDateString(r.end)}`);
        console.log(`Duration: ${r.duration} seconds`);
    }
}