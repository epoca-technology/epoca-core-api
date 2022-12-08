import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import * as moment from "moment";
import { BehaviorSubject } from "rxjs";
import { IUtilitiesService } from "../utilities";
import { IBinanceService, IBinanceCandlestick } from "../binance";
import { IApiErrorService } from "../api-error";
import { INotificationService } from "../notification";
import { ICandlestickService, ICandlestick, ICandlestickValidations, ICandlestickStream, ICandlestickModel } from "./interfaces";


@injectable()
export class CandlestickService implements ICandlestickService {
    // Inject dependencies
    @inject(SYMBOLS.CandlestickModel)                   private _model: ICandlestickModel;
    @inject(SYMBOLS.CandlestickValidations)             private _validations: ICandlestickValidations;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;


    // Candlestick Syncing Interval
    private readonly syncIntervalSeconds: number = 4;


    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;


    // Real Time Candlesticks Stream
    private streamInterval: any;
    private readonly streamSyncSecondsTolerance: number = 60;
    public readonly stream: BehaviorSubject<ICandlestickStream> = new BehaviorSubject({lastUpdate: 0, candlesticks: []});



    
    constructor() {}















    /* Candlestick Retrievers */









    /**
     * Retrieves the candlesticks for a given period in any interval. 
     * These candlesticks will be based on the 1 minute candlesticks.
     * @IMPORTANT This functionality is only for GUI to be able interact freely 
     * with the standard candlesticks.
     * @param start 
     * @param end 
     * @param intervalMinutes 
     * @returns Promise<ICandlestick[]>
     */
     public async getForPeriod(start: number, end: number, intervalMinutes: number): Promise<ICandlestick[]> {
        // Validate Request
        this._validations.canGetForPeriod(start, end, intervalMinutes);

        // If the interval minutes match the prediction candlesticks, return those instead
        if (intervalMinutes == this._model.predictionConfig.intervalMinutes) {
            return await this._model.get(start, end, undefined, true);
        } 
        
        // Otherwise, download the 1m candlesticks and alter their interval if needed.
        else {
            // Retrieve the 1m candlesticks for the given period
            const candlesticks1m: ICandlestick[] = await this._model.get(start, end);

            // Return them based in the provided interval
            return intervalMinutes > 1 ? this._model.alterInterval(candlesticks1m, intervalMinutes): candlesticks1m;
        }
    }






    /**
     * Retrieves the latest candlesticks based on a given limit.
     * @param prediction 
     * @param limit 
     * @returns Promise<ICandlestick[]>
     */
    public getLast(prediction?: boolean, limit?: number): Promise<ICandlestick[]> {
        return this._model.getLast(prediction, limit);
    }















    /* Candlestick Syncing & Saving */







    /**
     * Starts an interval that will update the candlesticks once per minute.
     * @returns Promise<void>
     */
     public async initialize(): Promise<void> {
        // Init the candlesticks
        let candlesticks: ICandlestick[] = [];

        // Perform the first sync persistently to prevent a server crash
        try {
            candlesticks = await this.syncCandlesticks();
            this.broadcastStream(candlesticks) 
        } catch (e) {
            console.log("Initial Candlestick Sync Failed. Attempting again in a few seconds: ", e);
            await this._utils.asyncDelay(5);
            candlesticks = await this.syncCandlesticks();
            this.broadcastStream(candlesticks) 
        }
        

        // Initialize the interval
        this.streamInterval = setInterval(async () => { 
            try { 
                candlesticks = await this.syncCandlesticks();
                this.broadcastStream(candlesticks) 
            } catch(e) { 
                console.log(`Failed to sync the Candlesticks, attempting again in a few seconds: `, e);
                await this._utils.asyncDelay(5);
                try { 
                    candlesticks = await this.syncCandlesticks();
                    this.broadcastStream(candlesticks) 
                } catch (e) {
                    console.log(`Failed to sync the candlesticks again, will attempt again when the interval triggers: `, e);
                    this._apiError.log("CandlestickService.startSync", e);
                    this._notification.candlestickSyncIssue(e);
                    this.broadcastStream([], e);
                }
            }
         }, this.syncIntervalSeconds * 1000);
    }









    
    /**
     * Clears the stream interval if it has been set and therefore,
     * stop syncing candlesticks.
     * @returns void
     */
    public stop(): void { if (this.streamInterval) clearInterval(this.streamInterval) }














    /**
     * Syncs the last standard and prediction candlesticks.
     * @returns Promise<ICandlestick[]>
     */
    public async syncCandlesticks(): Promise<ICandlestick[]> {
        // Init the timestamp
        const startTimestamp: number = await this._model.getLastOpenTimestamp();

        // Retrieve the last 1k candlesticks from Binance
        const bCandlesticks: IBinanceCandlestick[] = await this._binance.getCandlesticks(
            this._model.standardConfig.alias, 
            startTimestamp, 
            undefined, 
            1000
        );

        // Make sure that records have been extracted
        if (bCandlesticks && bCandlesticks.length) {
            // Process them and retrieve the latest records
            const candlesticks: ICandlestick[] = this.processBinanceCandlesticks(bCandlesticks);

            // Store them in the DB
            await this._model.saveCandlesticks(candlesticks);

            // Sync the prediction candlesticks as well
            await this.syncPredictionCandlesticks();

            // Return the 1m payload
            return candlesticks;
        }

        // Otherwise, throw an error
        else { 
            console.log(`Candlestick Response: `, bCandlesticks);
            throw new Error(this._utils.buildApiError("The Binance API should have returned at least 1 candlestick.", 1000));
        }
    }







    /**
     * Whenever 1m candlesticks are saved, the prediction candlesticks
     * are also updated respecting the interval configuration.
     * @returns Promise<void>
     */
     private async syncPredictionCandlesticks(): Promise<void> {
        // Init vars
        let candlestick: ICandlestick|undefined;
        let last: ICandlestick[];
        let remaining: boolean = true;
        
        // Iterate as long as there are candlesticks to insert/update
        while (remaining) {
            // Retrieve the last stored candlestick 
            last = await this._model.getLast(true, 1);

            // Retrieve a syncable candlestick if any
            candlestick = await this.getSyncablePredictionCandlestick(last[0]);

            // Check if a candlestick was found. If so, insert/update it
            if (candlestick) await this._model.saveCandlesticks([candlestick], true);

            // If a candlestick was found, continue the iteration
            remaining = candlestick != undefined;
        }
     }






     /**
      * Retrieves the prediction candlestick that has to be inserted or updated.
      * If it returns undefined, it means the forecase candlesticks are in sync.
      * @param last
      * @returns Promise<ICandlestick|undefined>
      */
    private async getSyncablePredictionCandlestick(last: ICandlestick|undefined): Promise<ICandlestick|undefined> {
        // Calculate the initial times
        let openTime: number = last ? last.ot: this._binance.candlestickGenesisTimestamp;
        let closeTime: number = this._model.getPredictionCandlestickCloseTime(openTime);

        // Retrieve the initial 1m candlesticks for the given interval and merge them if any
        let candlesticks1m: ICandlestick[] = await this._model.get(openTime, closeTime);
        let candlestick: ICandlestick|undefined = candlesticks1m.length ? this._model.mergeCandlesticks(candlesticks1m): undefined;

        // Check if there are candlesticks ahead
        let hasCandlesticksAhead: boolean = await this.hasCandlesticksAhead(closeTime);

        // There is an existing candlestick in the db. Handle the case accordingly
        if (last && candlestick) {
            /**
             * THE LAST CANDLESTICK IS COMPLETE
             * Since there could be candlesticks missing, it needs to iterate through intervals 
             * until the next candlestick is found.
             */
            if (last.ct == closeTime) {
                /**
                 * Update the last candlestick to make sure it has the last close price snapshot before moving to 
                 * the next candlestick. Also ensure the merged candlestick has correct open & close timestamps.
                 */
                await this.updatePredictionCandlestick(last, candlestick);

                // If there are candlesticks ahead, iterate until the next one is found
                if (hasCandlesticksAhead) {
                    let candlestickFound: boolean = false;
                    while (!candlestickFound) {
                        // Initialize the new candlestick"s times
                        openTime = closeTime + 1;
                        closeTime = this._model.getPredictionCandlestickCloseTime(openTime);
    
                        // Download the candlesticks for the next interval
                        candlesticks1m = await this._model.get(openTime, closeTime);
    
                        // If candlesticks were found, 
                        if (candlesticks1m.length) {
                            // Merge the 1m candlesticks
                            candlestick = this._model.mergeCandlesticks(candlesticks1m);
    
                            // End the iteration
                            candlestickFound = true;
                        }
                    }
                }

                // Otherwise, the candlesticks are in sync
                else { candlestick = undefined }
            }

            /* THE LAST CANDLESTICK IS INCOMPLETE */

            /**
             * If there are no candlesticks ahead and the last candlestick is the same as the 
             * freshly downloaded one, means the candlesticks are in sync.
             */
            else if (!hasCandlesticksAhead && last.ct == candlestick.ct) { 
                // Make sure the candlestick has the latest snapshot before ending the iteration.
                await this.updatePredictionCandlestick(last, candlestick);
                candlestick = undefined;
            }

            /**
             * If there are candlesticks ahead and the freshly downloaded candlestick"s close time 
             * is less than the real close time means there are candlesticks missings. In order to 
             * move on, set the real close time on the candlestick.
             */
            else if (hasCandlesticksAhead && candlestick.ct < closeTime) { candlestick.ct = closeTime }
        }


        /**
         * GENESIS CANDLESTICK
         * If the close time does not match the real close time and there are candlesticks ahead, 
         * use the real close time instead.
         */
        else if (!last && candlestick && hasCandlesticksAhead && candlestick.ct < closeTime) candlestick.ct = closeTime;


        /**
         * OPEN AND CLOSE TIMES ADJUSTMENTS
         * As there are many discrepancies in the Candlestick API from Binance"s end, 
         * in order to have perfect intervals, the open and close times need to always
         * add up perfectly.
         */
        if (candlestick) {
            // Set the correct open time
            candlestick.ot = openTime;

            // The close time cannot be greater than the calculated one
            if (candlestick.ct > closeTime) candlestick.ct = closeTime;
        }

        // Return the syncable candlestick if any
        return candlestick;
     }







    /**
     * Checks if there are 1 minute candlesticks ahead from a given close time.
     * This functionality is used to identify when Binance had interruptions and
     * missed 1 minute candlesticks.
     * @param realCloseTime 
     * @returns Promise<boolean>
     */
    private async hasCandlesticksAhead(realCloseTime: number): Promise<boolean> {
        const futureCandlesticks1m: ICandlestick[] = await this._model.get(realCloseTime, undefined, 1);
        return futureCandlesticks1m.length > 0;
    }







    /**
     * Given the last candlestick and the latest merge, it updates it in order to 
     * prevent the loss of existing snapshots.
     * @param last 
     * @param lastMerge 
     * @returns Promise<void>
     */
    private async updatePredictionCandlestick(last: ICandlestick, lastMerge: ICandlestick): Promise<void> {
        lastMerge.ot = last.ot;
        lastMerge.ct = last.ct;
        await this._model.saveCandlesticks([lastMerge], true);
    }





    














    /* Stream */








    /**
     * Given a list of candlesticks, it will broadcast a stream.
     * @param candlesticks 
     * @param error?
     * @returns void
     */
    private broadcastStream(candlesticks: ICandlestick[], error?: any): void {
        this.stream.next({
            lastUpdate: Date.now(),
            candlesticks: candlesticks,
            error: error ? this._utils.getErrorMessage(error): undefined
        });
    }









    /**
     * Verifies if a stream is currently in sync. It will check the last update 
     * and the last candlestick"s close times to make sure they are within the
     * established tolerance.
     * @param stream 
     * @returns boolean
     */
     public isStreamInSync(stream: ICandlestickStream): boolean {
        // Make sure there are candlesticks
        if (!stream || !stream.candlesticks || !stream.candlesticks.length) return false;

        // Calculate the minimum acceptable timestamp
        const min: number = moment(Date.now()).subtract(this.streamSyncSecondsTolerance, "seconds").valueOf();

        // Make sure the last update is in sync
        if (stream.lastUpdate < min) return false;

        // Make sure the last candlestick is in sync
        if (stream.candlesticks.at(-1).ct < min) return false;

        // Otherwise, the stream is in sync
        return true;
    }


    












    /* Candlesticks Proccessors */






    /**
     * Given a list of binance candlesticks, it will convert them into the correct format
     * in order to be stored in the db.
     * @param candlesticks 
     * @returns ICandlestick[]
     */
    private processBinanceCandlesticks(candlesticks: IBinanceCandlestick[]): ICandlestick[] {
        // Init the list
        let list: ICandlestick[] = [];

        // Iterate over each candlestick and convert it into the proper format
        for (let c of candlesticks) {
            list.push({
                ot: c[0],
                ct: c[6],
                o: <number>this._utils.outputNumber(c[1], {dp: 2}),
                h: <number>this._utils.outputNumber(c[2], {dp: 2}),
                l: <number>this._utils.outputNumber(c[3], {dp: 2}),
                c: <number>this._utils.outputNumber(c[4], {dp: 2}),
                v: <number>this._utils.outputNumber(c[7], {dp: 2})
            });
        }

        // Return the final list
        return list;
    }
}