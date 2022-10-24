import {injectable, inject} from "inversify";
import { BehaviorSubject } from "rxjs";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IApiErrorService } from "../api-error";
import { IBinanceOrderBook, IBinanceService } from "../binance";
import { ICandlestickService } from "../candlestick";
import { IOrderBook, IOrderBookItem, IOrderBookService } from "./interfaces";




@injectable()
export class OrderBookService implements IOrderBookService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.BinanceService)                     private _binance: IBinanceService;
    @inject(SYMBOLS.CandlestickService)                 private _candlestick: ICandlestickService;


    /**
     * Order Book Sync Interval
     * Every intervalSeconds, the order book will be synced and broadcasted.
     */
    private syncInterval: any;
    private readonly intervalSeconds: number = 30;
 
 
    /**
      * Active Order Book Observable
      * Every time the order book is updated, the new state is broadcasted 
      * through this observable.
      */
    public active: BehaviorSubject<IOrderBook|undefined> = new BehaviorSubject(undefined);


    /**
     * Safe Price Depth
     * This is the price that will be chosen as "Safe" from the processed order
     * book. In case the length of the side is less than safePriceDepth, the last
     * price will be set instead.
     */
    private readonly safePriceDepth: number = 5;



    /**
     * Price Difference Tolerance
     * Once the order book is built, the safe bid & ask will be compared to the 
     * latest candlestick's close price (spot market) and make sure it is within 
     * an acceptable range.
     */
    private readonly priceDifferenceTolerance: number = 3;



    constructor() {}




    /* Initializer */




    /**
     * Initializes the interval that will keep the Order Book
     * synced with the Futures Market.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the current state safely
        try { await this.getBook() } catch (e) { }

        // Initialize the interval
        this.syncInterval = setInterval(async () => {
            try { await this.getBook() } catch (e) { }
        }, this.intervalSeconds * 1000);
    }







    /**
     * Stops the order book service interval and unsets the current state.
     */
    public stop(): void {
        if (this.syncInterval) clearInterval(this.syncInterval);
        this.syncInterval = undefined;
        this.active.next(undefined);
    }










    /* Retriever */






    /**
     * Builds, validates and broadcasts the current order book
     * state in a persistant manner. Throws an error if there is a
     * problem retrieving the data or if there is a discrepancy
     * of any kind.
     * @returns Promise<IOrderBook>
     */
    public async getBook(): Promise<IOrderBook> {
        // Init the book
        let book: IOrderBook|undefined;

        /**
         * Build and broadcast the book in a persistant manner. If it is not possible,
         * log an api error prior to resolving the function.
         */
        try {
            book = await this.buildBook();
            this.active.next(book);
            return book;
        } catch(e) {
            console.error(`1) Error when building the order book. Attempting again in a few seconds.`, e);
            await this._utils.asyncDelay(3);
            try {
                book = await this.buildBook();
                this.active.next(book);
                return book;
            } catch(e) {
                console.error(`2) Error when building the order book. Attempting again in a few seconds.`, e);
                await this._utils.asyncDelay(3);
                try {
                    book = await this.buildBook();
                    this.active.next(book);
                    return book;
                } catch(e) {
                    console.error(`3) Error when building the order book. Attempting for the last time in a few seconds.`, e);
                    await this._utils.asyncDelay(3);
                    try {
                        book = await this.buildBook();
                        this.active.next(book);
                        return book;
                    } catch(e) {
                        // Log the error
                        console.error("It was not possible to build the order book: ", e);
                        await this._apiError.log("OrderBook.getBook", e);

                        // Rethrow the error
                        throw e;
                    }
                }
            }
        }
    }








    /**
     * Retrieves the current order book from Binance's API and coverts
     * it into the Order Book that is used by Epoca.
     * @returns Promise<IOrderBook>
     */
    private async buildBook(): Promise<IOrderBook> {
        // Retrieve the latest order book state
        const rawBook: IBinanceOrderBook = await this._binance.getOrderBook();

        // Build the items
        const bids: IOrderBookItem[] = this.buildBookItems(rawBook.bids, true);
        const asks: IOrderBookItem[] = this.buildBookItems(rawBook.asks, false);

        // Calculate the safe bid and ask
        const safeBid: number = bids.length > this.safePriceDepth ? bids[this.safePriceDepth].price: bids.at(-1).price;
        const safeAsk: number = asks.length > this.safePriceDepth ? asks[this.safePriceDepth].price: asks.at(-1).price;

        // Validate the integrity of the safe rates
        this.validateSafeRatesIntegrity(safeBid, safeAsk);

        // Finally, return the order book
        return {
            last_update: Date.now(),
            safe_bid: safeBid,
            safe_ask: safeAsk,
            bids: bids,
            asks: asks,
        }
    }






    /**
     * Builds the list of order book items based on the provided side.
     * Once built, the items are sorted based on provided params.
     * @param rawSide 
     * @param resverseOrder 
     * @returns Array<IOrderBookItem>
     */
    private buildBookItems(rawSide: Array<Array<string>>, resverseOrder: boolean): Array<IOrderBookItem> {
        // Init the object that will keep track of whole prices & quantities
        let sideItems: {[wholePrice: number]: number} = {};

        // Iterate over each item
        for (let item of rawSide) {
            // Init the key of the item (whole price)
            const key: number = Math.floor(Number(item[0]));

            // Init the quantity
            const qty: number = <number>this._utils.outputNumber(item[1], {dp: 4});

            // Add or update the item
            sideItems[key] = typeof sideItems[key] == "number" ? sideItems[key] + qty: qty
        }

        // Build the list of items
        let final: IOrderBookItem[] = Object.entries(sideItems).map((rawItem) => {
            return { price: Number(rawItem[0]), quantity: rawItem[1]};
        });

        // Sort the records
        if (resverseOrder) {
            final.sort((a, b) => (a.price < b.price) ? 1 : -1);
        } else {
            final.sort((a, b) => (a.price > b.price) ? 1 : -1);
        }

        // And finally, return the list
        return final;
    }








    /**
     * Ensures the safe rates are valid by ensuring they are within an acceptable
     * range from the spot market candlesticks.
     * @param safeBid 
     * @param safeAsk 
     */
    private validateSafeRatesIntegrity(safeBid: number, safeAsk: number): void {
        // Make sure there are candlesticks in the stream
        if (!this._candlestick.stream.value.candlesticks.length) {
            throw new Error(this._utils.buildApiError(`The integrity of the order book cannot be validated because
            there are no spot candlesticks in the stream.`, 23000));
        }

        // Init the current candlestick's close price
        const candlestickPrice: number = this._candlestick.stream.value.candlesticks.at(-1).c;

        // Validate the difference between the candlestick price and the safe bid
        const bidDiff: number = <number>this._utils.calculatePercentageChange(candlestickPrice, safeBid);
        if (bidDiff > this.priceDifferenceTolerance || bidDiff < -(this.priceDifferenceTolerance)) {
            throw new Error(this._utils.buildApiError(`The difference between the current candlestick (spot) 
            and the safe bid (futures) exceeds the established tolerance. Difference: ${bidDiff}%`, 23001));
        }

        // Validate the difference between the candlestick price and the safe ask
        const askDiff: number = <number>this._utils.calculatePercentageChange(candlestickPrice, safeAsk);
        if (askDiff > this.priceDifferenceTolerance || askDiff < -(this.priceDifferenceTolerance)) {
            throw new Error(this._utils.buildApiError(`The difference between the current candlestick (spot) 
            and the safe ask (futures) exceeds the established tolerance. Difference: ${askDiff}%`, 23002));
        }

        // The safe bid can never be greater than the safe ask
        if (safeBid > safeAsk) {
            throw new Error(this._utils.buildApiError(`The order book's safe bid cannot be greater than 
            the safe ask. Bid: ${safeBid}, Ask: ${safeAsk}`, 23003));
        }
    }
}