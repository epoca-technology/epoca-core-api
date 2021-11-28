import {inject, injectable} from "inversify";
import { ITrendService, ITrendForecast, ITrendData } from "./interfaces";
import { SYMBOLS } from "../../../symbols";
import { INumberService } from "../number";
import {BigNumber} from 'bignumber.js';
import { ITendencyForecast } from "../../../types";

@injectable()
export class TrendService implements ITrendService {
    // Inject dependencies
    @inject(SYMBOLS.NumberService)           private _number: INumberService;


    // Configuration
    private readonly streakRequirement: number = 3;







    public forecast(numberSeries: number[]): any {
        // Init the forecast
        let forecast: ITrendForecast = this.getDefaultForecast();

        for (let i = 0; i < numberSeries.length; i++) {

            // Analyse until the last item
            if (i < numberSeries.length - 1) {
                // Price went down
                if (numberSeries[i] > numberSeries[i + 1]) { this.priceChanged(forecast, -1) } 
                
                // Price went up
                else if (numberSeries[i + 1] > numberSeries[i]) { this.priceChanged(forecast, 1) } 
                
                // Price didnt move
                else { this.priceChanged(forecast, 0) }
            } 
            
            // Last record | Perform Forecast
            else {
                this.forecastResult(forecast);
            }
        }

        // Complete & Return the forecast object
        forecast.result = this.forecastResult(forecast);
        return forecast;
    }






    private forecastResult(forecast: ITrendForecast): ITendencyForecast {
        /* Handle the case according to the last move */

        // Price went up
        if (forecast.lastMove == 1) {
            // Check if it is continuing an up streak
            if (this.isStreak(forecast.up.activeCount) && forecast.up.activeCount <= forecast.up.avgCount) {
                return 1
            }
            // Check if it could be the end of an up streak
            else if (forecast.up.activeCount > forecast.up.avgCount) {
                return -1;
            }
            // Check if it could be the end of a down streek
            else if (forecast.lastStreak.tendency == -1 && forecast.lastStreak.count <= forecast.down.avgCount) {
                return 1;
            }
            // Otherwise, stand neutral
            else {
                return 0;
            }
        }

        // Price went down
        else if (forecast.lastMove == -1) {
            // Check if it is continuing a down streak
            if (this.isStreak(forecast.down.activeCount) && forecast.down.activeCount <= forecast.down.avgCount) {
                return -1;
            }
            // Check if it could be the end of a down streak
            else if (forecast.down.activeCount > forecast.down.avgCount) {
                return 1;
            }
            // Check if it could be the end of an up streek
            else if (forecast.lastStreak.tendency == 1 && forecast.lastStreak.count <= forecast.up.avgCount) {
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
            if (this.isStreak(forecast.up.activeCount) && forecast.up.activeCount <= forecast.up.avgCount) {
                return 1
            }
            // Check if it is in a down streak
            else if (this.isStreak(forecast.down.activeCount) && forecast.down.activeCount <= forecast.down.avgCount) {
                return -1;
            }
            // Border case - no price change
            else {
                console.log('In forecastResult border case ?');
                return 0;
            }
        }
    }








    private priceChanged(state: ITrendForecast, change: ITendencyForecast): void {
        // Price went up
        if (change == 1) {
            // Increase the counter
            state.up.activeCount += 1;

            // Reset the down trend
            this.resetTrend(state, -1);
        }

        // Price went down
        else if (change == -1) {
            // Increase the counter
            state.down.activeCount += 1;

            // Reset the up trend
            this.resetTrend(state, 1);
        }

        // Price did not move - Reset both trends
        else {
            this.resetTrend(state, -1);
            this.resetTrend(state, 1);
        }


        // Set the last move
        state.lastMove = change;
    }







    /**
     * Ends a streak and returns the new data object.
     * @param data 
     * @param tendency 
     * @returns void
     */
    private resetTrend(state: ITrendForecast, tendency: ITendencyForecast): void {
        /* Handle it according to the tendency */

        if (tendency == 1) {
            // Check if there was a streak, otherwise just reset the dynamic values
            if (this.isStreak(state.up.activeCount)) {
                // Add the count to history
                state.up.history.push(state.up.activeCount);

                // Calculate the new avg
                state.up.avgCount = this._number.calculateAverage(state.up.history, 0);

                // Set as the last streak
                state.lastStreak = {
                    tendency: 1,
                    count: state.up.activeCount
                }
            }

            // Reset the count
            state.up.activeCount = 0;
        }
        else if (tendency == -1) {
            // Check if there was a streak, otherwise just reset the dynamic values
            if (this.isStreak(state.down.activeCount)) {
                // Add the count to history
                state.down.history.push(state.down.activeCount);

                // Calculate the new avg
                state.down.avgCount = this._number.calculateAverage(state.down.history, 0);

                // Set as the last streak
                state.lastStreak = {
                    tendency: 1,
                    count: state.down.activeCount
                }
            }

            // Reset the count
            state.down.activeCount = 0;
        }
    }











    /**
     * Determines if a trend is on a streek based on the class config.
     * @param streakCount 
     * @returns boolean
     */
    private isStreak(streakCount: number): boolean {
        return streakCount >= this.streakRequirement;
    }











    /**
     * Returns the default forecast object.
     * @returns ITrendForecast
     */
    private getDefaultForecast(): ITrendForecast {
        return {
            result: 0,
            lastMove: undefined,
            lastStreak: {
                count: 0,
                tendency: 0
            },
            up: {
                activeCount: 0,
                avgCount: 0,
                history: []
            },
            down: {
                activeCount: 0,
                avgCount: 0,
                history: []
            }
        }
    }

}