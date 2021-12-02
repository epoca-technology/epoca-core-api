import {appContainer} from "../../ioc";
import { SYMBOLS, IVerbose } from "../../types";
import { 
    IBalanceSimulation,
    IBalanceSimulationConfig,
    IBalanceHistory,
    ITradingSimulationPosition,
    IBalanceSimulationAccumulatedFees
} from "./interfaces";
import {BigNumber} from "bignumber.js";


// Init Utilities Service
import { IUtilitiesService } from "../../modules/shared/utilities";
const _utils = appContainer.get<IUtilitiesService>(SYMBOLS.UtilitiesService);





export class BalanceSimulation implements IBalanceSimulation {
    /**
     * @initial
     * This balance will be used to initialize the simulation. If allInMode is not enabled, this
     * number will also be used as the limit for opening new positions.
     * @current
     * This is the accumulated balance. 
     * If the allInMode is enabled, it will use this entire balance to open new positions even this
     * number is greater than the initial balance. Otherwise, it will open positions using the initialBalance.
     * @difference
     * The current difference between the current & initial balance. It can be a possitive or a negative number.
     * @history
     * This is the history of the balances as positions are closed. The indexes match the TradingSimulation
     * positions list.
     */
    public readonly initial: number;
    public current: number;
    public difference: number = 0;
    public history: IBalanceHistory[] = [];



    /**
     * @fees
     * This object will accumulate all fees individually and combined.
     */
    public fees: IBalanceSimulationAccumulatedFees = {
        netFee: new BigNumber(0),
        borrowInterestFee: new BigNumber(0),
        netTradesFee: new BigNumber(0),
        openTradeFee: new BigNumber(0),
        closeTradeFee: new BigNumber(0),
    }





    /**
     * @leverage
     * This is the leverage that will be used when opening positions in order to increase the volatility
     * of the asset.
     * DEFAULT: 10
     */
     private readonly leverage: number = 10;




    /**
     * @borrowInterestPercent
     * This is the percentual fee charged for borrowing. It is charged when closing a position and is 
     * based on the borrowed amount.
     * DEFAULT: 0.02
     * @tradeFeePercent
     * This is the percentual fee charged for trading. This fee has to be calculated twice per position.
     * The first one is based on the borrowed amount pre-trading and the second one is based on the 
     * traded amount and the price of the position close.
     * DEFAULT: 0.04
     */
    private readonly borrowInterestPercent: number = 0.02;
    private readonly tradeFeePercent: number = 0.04;



    /**
     * @minimumPositionAmount 
     * If the current balance is smaller than this number it will throw an error.
     * DEFAULT: 80
     */
    private readonly minimumPositionAmount: number = 80;


    /**
     * @allInMode
     * If this mode is enabled, it will place the entire available balance into new positions.
     * Otherwise, it will place amounts that are less than or equal to the initial balance.
     * DEFAULT: false
     */
    private readonly allInMode: boolean;




    /**
     * @verbose
     * Displays additional data of the process for debugging purposes.
     * DEFAULT: 0
     */
     private readonly verbose: IVerbose = 0;



    constructor(config: IBalanceSimulationConfig) {
        // Set Balance Properties
        this.initial = config.initial;
        this.current = config.initial;

        // Set Leverage
        if (typeof config.leverage == "number") this.leverage = config.leverage;

        // Set Fees
        if (typeof config.borrowInterestPercent == "number") this.borrowInterestPercent = config.borrowInterestPercent;
        if (typeof config.tradeFeePercent == "number") this.tradeFeePercent = config.tradeFeePercent;

        // Set Minimum Amount
        if (typeof config.minimumPositionAmount == "number") this.minimumPositionAmount = config.minimumPositionAmount;

        // Set Mode
        this.allInMode = config.allInMode == true;

        // Set Verbosity
        if (typeof config.verbose == "number") this.verbose = config.verbose;
    }






    /**
     * Verifies if there is enough balance to open positions
     * @returns void
     */
    public canOpenPosition(): void {
        if (this.current < this.minimumPositionAmount) {
            throw new Error(`The simulation has ended because the current balance (${this.current.toString()}) 
            is inferior to the minimumPositionAmount (${this.minimumPositionAmount}). INSUFFICIENT_BALANCE`);
        }
    }









    /**
     * Triggers whenever a position is closed, it will perform all calculations
     * and record them in history.
     * @param position 
     */
    public onPositionClose(position: ITradingSimulationPosition): void {
        // Init values
        const previous: number = this.current;
        let current: BigNumber = new BigNumber(this.current);


        // Find the balance that will be placed into the position
        const positionAmount: number = this.getPositionAmount();

        // Borrow the amount based on leverage
        const borrowedAmount: number = this.getBorrowedAmount(positionAmount);
        let borrowedAmountBN: BigNumber = new BigNumber(borrowedAmount);

        // Calculate the borrow interest fee
        const borrowInterestFee: number = _utils.calculateFee(borrowedAmount, this.borrowInterestPercent, 2, true);

        // Calculate the open trade fee
        const openTradeFee: number = _utils.calculateFee(borrowedAmount, this.tradeFeePercent, 2, true);

        // Deduct the trade fee from the borrowed amount
        //borrowedAmountBN = borrowedAmountBN.minus(openTradeFee);

        /* Handle the rest based on the outcome of the position */

        // Calculate the price change
        const priceChange: number = _utils.calculatePercentageChange(position.openPrice, position.closePrice);

        // Alter the borrowed amount based on the price change %
        borrowedAmountBN = new BigNumber(_utils.alterNumberByPercentage(borrowedAmountBN, priceChange));

        // Calculate the close trade fee
        const closeTradeFee: number = _utils.calculateFee(borrowedAmountBN, this.tradeFeePercent, 2, true);

        // Init the difference
        let difference: number;

        // Successful Long Position
        if (position.type == 'long' && position.outcome) {
            // Calculate the difference
            difference = borrowedAmountBN.minus(borrowedAmount).toNumber();

            // Calculate the new current balance
            current = current.plus(difference);
        }

        // Unsuccessful Long Position
        else if (position.type == 'long' && !position.outcome) {
            // Calculate the difference
            difference = new BigNumber(borrowedAmount).minus(borrowedAmountBN).toNumber();

            // Calculate the new current balance
            current = current.minus(difference);
        }

        // Successful Short Position
        else if (position.type == 'short' && position.outcome) {
            // Calculate the difference
            difference = new BigNumber(borrowedAmount).minus(borrowedAmountBN).toNumber();

            // Calculate the new current balance
            current = current.plus(difference);
        }

        // Unsuccessful Short Position
        else if (position.type == 'short' && !position.outcome) {
            // Calculate the difference
            difference = borrowedAmountBN.minus(borrowedAmount).toNumber();

            // Calculate the new current balance
            current = current.minus(difference);
        }

        // Calculate the net fees
        const netFee: number = new BigNumber(borrowInterestFee).plus(openTradeFee).plus(closeTradeFee).toNumber();
        const netTradesFee: number = new BigNumber(openTradeFee).plus(closeTradeFee).toNumber();

        // Deduct the net fee from the current balance
        this.current = current.minus(netFee).toNumber();

        // Update the difference
        this.difference = new BigNumber(this.current).minus(this.initial).toNumber();

        // Add the balance update to history
        this.history.push({
            previous: previous,
            current: this.current,
            difference: difference,
            fee: {
                netFee: netFee,
                borrowInterestFee: borrowInterestFee,
                netTradesFee: netTradesFee,
                openTradeFee: openTradeFee,
                closeTradeFee: closeTradeFee
            }
        });

        // Update Fee Accumulators
        this.fees = {
            netFee: this.fees.netFee.plus(netFee),
            borrowInterestFee: this.fees.borrowInterestFee.plus(borrowInterestFee),
            netTradesFee: this.fees.netTradesFee.plus(netTradesFee),
            openTradeFee: this.fees.openTradeFee.plus(openTradeFee),
            closeTradeFee: this.fees.closeTradeFee.plus(closeTradeFee),
        }

        // Log it if applies
        if (this.verbose > 0) this.displayBalanceUpdate();
    }







    /**
     * Retrieves the total amount that has been borrowed.
     * @param positionAmount 
     * @returns number
     */
    private getBorrowedAmount(positionAmount: number): number {
        return _utils.roundNumber(new BigNumber(positionAmount).times(this.leverage), 2);
    }

    






    /**
     * Retrieves the amount that will be placed into the position.
     * @returns number
     */
    private getPositionAmount(): number {
        // Set the entire current balance is allInMode is enabled
        if (this.allInMode) {
            return this.current;
        } 
        
        // If the current is greater than the initial, return the initial.
        else if (this.current > this.initial) {
            return this.initial;
        } 
        
        // Otherwise, return whatever is left;
        else {
            return this.current;
        }
    }





















    /* Verbose */




    /**
     * Displays a summary of a balance update.
     * @returns void
     */
    private displayBalanceUpdate(): void {
        // Init the record
        const h: IBalanceHistory = this.history[this.history.length -1];

        // Display Fees - Can be silenced once validated
        console.log(`${h.previous}$ -> ${h.current}$ (${h.current > h.previous ? '+':'-'}${h.difference}$) | Fee: ${h.fee.netFee}$`);
        if (this.verbose > 1) console.log(`BIF: ${h.fee.borrowInterestFee}$ | OTF: ${h.fee.openTradeFee}$ | CTF: ${h.fee.closeTradeFee}$`);
        console.log(' ');
    }
}