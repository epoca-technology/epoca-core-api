import { ITendencyForecast } from "../../types";
import { ILastStreak, ITrendData, ITrendForecast, ITrendForecastOutput } from "./interfaces";
import {BigNumber} from 'bignumber.js';


export class TrendForecast implements ITrendForecast {
    // Configuration Values
    private readonly streakRequirement: number;
    private readonly verbose: boolean;



    /* State Defaults */

    // Last Price move
    private lastTendency: ITendencyForecast|undefined;
    
    // Last Streak
    private lastStreak: ILastStreak = {count: 0,tendency: 0};

    // Up Data
    private up: ITrendData = {activeCount: 0, totalCount: 0,avgStreakCount: 0,streakHistory: []};

    // Down Data
    private down: ITrendData = {activeCount: 0, totalCount: 0,avgStreakCount: 0,streakHistory: []};



    constructor(
        streakRequirement?: number,
        verbose?: boolean
    ) {
        this.streakRequirement = streakRequirement || 3;
        this.verbose = verbose == true;
    }






    /**
     * Processes all the items in the list and returns a TrendForecast object.
     * @returns 
     */
    public forecast(numberSeries: number[]): ITrendForecastOutput {
        // Make sure the series provided is a valid array
        if (typeof numberSeries != "object" || numberSeries.length < 10) {
            throw new Error('A minimum of 10 items must be provided in order to retrieve a trend forecast.');
        }

        // Iterate over each item and analyze it
        for (let i = 0; i < numberSeries.length; i++) { this.processItem(numberSeries[i], numberSeries[i + 1])}

        // Complete & Return the forecast object
        return {
            result: this.getResult(),
            lastTendency: this.lastTendency,
            //lastStreak: this.lastStreak,
            up: this.up,
            down: this.down
        }
    }



    private getResult(): ITendencyForecast {
        // Bullish Scenario

         /*if (
            this.up.totalCount > this.down.totalCount && 
            this.up.activeCount > 0 && 
            this.up.activeCount <= this.up.avgStreakCount
        ) {
            return 1;
        }
        else if (
            this.up.activeCount > 1 && 
            this.up.activeCount <= this.up.avgStreakCount
        ) {
            return 1;
        }
       else if (this.up.activeCount > this.up.avgStreakCount) {
            return -1;
        }*/
        /*if (
            this.down.totalCount > this.up.totalCount && 
            this.down.activeCount > 0 && 
            this.down.activeCount <= this.down.avgStreakCount + 1 && 
            this.lastStreak.tendency == -1
        ) {
            return -1;
        }
        else*/ if (
            this.down.totalCount > this.up.totalCount &&
            //this.lastStreak.tendency == -1 && 
            //(this.lastTendency == -1 || this.lastTendency == 0) &&
            this.down.activeCount > 0 && this.down.activeCount <= this.down.avgStreakCount +1
        ) {
            return -1;
        }
        else if (
            this.up.totalCount > this.down.totalCount && 
            this.down.activeCount > 1 && this.down.activeCount <= this.down.avgStreakCount +1
        ) {
            
        }

        return 0;

        if (this.up.activeCount > 1 && this.up.activeCount <= this.up.avgStreakCount) {
            return 1;
        }

        if (this.up.activeCount > this.up.avgStreakCount) {
            return -1;
        }

        if (this.down.activeCount > 1 && this.down.activeCount <= this.down.avgStreakCount) {
            return -1;
        }

        if (this.down.activeCount > this.down.avgStreakCount) {
            return 1;
        }
        else {
            return 0;
        }
    }




    /*private forecastResult(): ITendencyForecast {
        // Handle the case according to the last move

        // Price went up
        if (this.lastTendency == 1) {
            // Check if it is continuing an up streak
            if (this.isStreak(this.up.activeCount) && this.up.activeCount <= this.up.avgCount +1) {
                return 1
            }
            // Check if it could be the end of an up streak
            else if (this.up.activeCount >= this.up.avgCount +1) {
                return -1;
            }
            // Check if it could be the end of a down streek
            else if (this.lastStreak.tendency == -1 && this.lastStreak.count <= this.down.avgCount) {
                return 1;
            }
            // Otherwise, stand neutral
            else {
                return 0;
            }
        }

        // Price went down
        else if (this.lastTendency == -1) {
            // Check if it is continuing a down streak
            if (this.isStreak(this.down.activeCount) && this.down.activeCount <= this.down.avgCount +1) {
                return -1;
            }
            // Check if it could be the end of a down streak
            else if (this.down.activeCount >= this.down.avgCount +1) {
                return 1;
            }
            // Check if it could be the end of an up streek
            else if (this.lastStreak.tendency == 1 && this.lastStreak.count <= this.up.avgCount) {
                return -1;
            }
            // Otherwise, stand neutral
            else {
                return 0;
            }
        }

        // Price didnt move
        else {
            // Check if it is in an up streak
            if (this.isStreak(this.up.activeCount) && this.up.activeCount <= this.up.avgCount +1) {
                return 1
            }
            // Check if it is in a down streak
            else if (this.isStreak(this.down.activeCount) && this.down.activeCount <= this.down.avgCount +1) {
                return -1;
            }
            // Border case - no price change
            else {
                console.log('In forecastResult border case ?');
                return 0;
            }
        }
    }*/















    /**
     * Processes an item given a tendency and stores everything locally.
     * @param price 
     * @param nextPrice 
     * @returns void
     */
    private processItem(price: number, nextPrice: number|undefined): void {
        // Check if there is a next price
        if (typeof nextPrice == "number") {
            // Init the tendency
            const tendency: ITendencyForecast = this.getTendency(price, nextPrice);

            // Price went up
            if (tendency == 1) {
                console.log(`UP: ${price} -> ${nextPrice} (${this.calculatePercentageChange(price, nextPrice)}%)`);
                // Increase the counter
                this.up.activeCount += 1;
                this.up.totalCount += 1;

                // Reset the down trend
                this.resetTendency(-1);
            }

            // Price went down
            else if (tendency == -1) {
                console.log(`DOWN: ${price} -> ${nextPrice} (${this.calculatePercentageChange(price, nextPrice)}%)`);
                // Increase the counter
                this.down.activeCount += 1;
                this.down.totalCount += 1;

                // Reset the up trend
                this.resetTendency(1);
            }

            // Price did not move - Reset both trends
            else {
                console.log(`SIDEWAYS: ${this.calculatePercentageChange(price, nextPrice)}`);
                this.resetTendency(-1);
                this.resetTendency(1);
            }


            // Set the last move
            this.lastTendency = tendency;
        }
    }







    /**
     * Given the current and the next price, it will determine the trend it followed.
     * @param price 
     * @param newPrice 
     * @returns ITendencyForecast
     */
    private getTendency(price: number, newPrice: number): ITendencyForecast {
        if (price > newPrice) {
            return -1;
        } else if (newPrice > price) {
            return 1;
        } else {
            return 0;
        }
    }






    /**
     * Ends a streak and records is as the last streak (if any).
     * @param tendency 
     * @returns void
     */
     private resetTendency(tendency: ITendencyForecast): void {
        /* Handle it according to the tendency */

        if (tendency == 1) {
            // Check if there was a streak, otherwise just reset the dynamic values
            if (this.isStreak(this.up.activeCount)) {
                // Add the count to history
                this.up.streakHistory.push(this.up.activeCount);

                // Calculate the new avg
                this.up.avgStreakCount = this.calculateAverage(this.up.streakHistory);

                // Set as the last streak
                this.lastStreak = { tendency: 1, count: this.up.activeCount}
            }

            // Reset the count
            this.up.activeCount = 0;
        }
        else if (tendency == -1) {
            // Check if there was a streak, otherwise just reset the dynamic values
            if (this.isStreak(this.down.activeCount)) {
                // Add the count to history
                this.down.streakHistory.push(this.down.activeCount);

                // Calculate the new avg
                this.down.avgStreakCount = this.calculateAverage(this.down.streakHistory);

                // Set as the last streak
                this.lastStreak = {tendency: -1,count: this.down.activeCount}
            }

            // Reset the count
            this.down.activeCount = 0;
        }
    }














    /* Misc Helpers */





    /**
     * Determines if a trend is on a streek based on the class config.
     * @param streakCount 
     * @returns boolean
     */
     private isStreak(streakCount: number): boolean { return streakCount >= this.streakRequirement; }











    /**
     * Given a list of numbers, it will calculate the average.
     * @param numberSeries 
     * @param decimalPlaces?
     * @returns number
     */
     private calculateAverage(numberSeries: number[]): number {
        // Init values
        let acum: BigNumber = new BigNumber(0);

        // Iterate over the numbers
        for (let n of numberSeries) { acum = acum.plus(n)}

        // Return the results
        return acum
                .dividedBy(numberSeries.length)
                .decimalPlaces(0)
                .toNumber();
    }







    /**
     * Given an old and a new number, it will calculate the % difference between the 2.
     * @param oldNumber 
     * @param newNumber 
     * @returns number
     */
     private calculatePercentageChange(oldNumber: number, newNumber: number): number {
        // Init result
        let change: number = 0;

        // Handle an increase
        if (newNumber > oldNumber) {
            const increase: number = newNumber - oldNumber;
            change = new BigNumber(increase).dividedBy(oldNumber).times(100).decimalPlaces(2).toNumber();
        } 
        
        // Handle a decrease
        else if (oldNumber > newNumber){
            const decrease: number = oldNumber - newNumber;
            change = new BigNumber(decrease).dividedBy(oldNumber).times(100).times(-1).decimalPlaces(2).toNumber();
        }

        // Return the forecasted change
        return change;
    }
}