import {appContainer} from "../../ioc";
import { SYMBOLS, IVerbose } from "../../types";
import { 
    IBalanceSimulation,
    IBalanceSimulationConfig,
    IBalanceHistory,
    ITradingSimulationPosition,
    IBalanceSimulationAccumulatedFees,
    ILeverageSpecs,
    IPositionExitParameters
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
     * @history
     * This is the history of the balances as positions are closed. The indexes match the TradingSimulation
     * positions list.
     * @currentChange
     * This is the current change in percentage compared to the initial amount.
     */
    public bank: BigNumber = new BigNumber(0);
    public readonly initial: number;
    public current: number;
    public history: IBalanceHistory[] = [];
    private currentChange: number = 0;



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
     * The leverage is dynamically updated based on the current performance, if it is going well, the leverage
     * drops in order to reduce risk, otherwise it goes up in order to make a recovery possible.
     * Starts at: 6
     * @leverageSpecs
     * These are the take profit / stop loss specifications based on the current leverage.
     */
    private bankEnabled = true;
    private bankDepositPercent = 3;
    private leverage: number = 2;
    private leverageSpecs: ILeverageSpecs = {
        2: { takeProfit: 3, stopLoss: 3.5 },
        5: { takeProfit: 3, stopLoss: 3 },
        10: { takeProfit: 3, stopLoss: 4 },
    }



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

        // Set Verbosity
        if (typeof config.verbose == "number") this.verbose = config.verbose;
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

        // Deduct the trade fee from the borrowed amount in order to calculate the correct close trade fee
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

        // Update the change
        this.currentChange = _utils.calculatePercentageChange(this.initial, this.current, 0, true);

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
        if (this.verbose > 0) this.displayBalanceUpdate(positionAmount);
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
        if (this.currentChange >= 0) { return this.initial; } else { return this.current; }
    }






    /**
     * This function will check if a new position can be opened, handle bank deposit if applicable and
     * setup the new leverage that will be used on the position.
     * @returns IPositionExitParameters
     */
    public getPositionExitParameters(): IPositionExitParameters {
        // Firslty, make sure that a new position can be opened
        this.canOpenPosition();

        // Check if a bank deposit has to be made
        if (this.currentChange >= 150 && this.current > this.history[this.history.length - 1].previous && this.bankEnabled) this.makeBankDeposit();

        // Set the current leverage
        this.leverage = this.getCurrentLeverage();

        // Return the exit specs
        return this.leverageSpecs[this.leverage];
    }








    /**
     * Verifies if there is enough balance to open positions
     * @returns void
     */
     private canOpenPosition(): void {
        if (this.current < this.minimumPositionAmount) {
            throw new Error(`The current balance (${this.current.toString()}) is less than the minimumPositionAmount. The balance is the bank is: ${this.bank.toNumber()}`);
        }
    }





    
    /**
     * Makes a bank deposit if the amount is equals or greater than 20%.
     * @returns void
     */
    private makeBankDeposit(): void {
        // Init savings
        const savings = new BigNumber(this.current).minus(this.initial);

        // Calculate the deposit amount
        const depositAmount: number = _utils.alterNumberByPercentage(savings, this.bankDepositPercent - 100);

        // Deduct the savings from the current 
        this.current = new BigNumber(this.current).minus(depositAmount).toNumber();

        // Add the savings to the bank balance
        this.bank = this.bank.plus(depositAmount);

        // Update the current change
        this.currentChange = _utils.calculatePercentageChange(this.initial, this.current, 0, true);
        
        // Log it if applies
        if (this.verbose > 1) this.displayBankTransaction(depositAmount);
    }







    /**
     * Based on the current change, it will retrieve the leverage that will be used on the
     * next position.
     * @returns 
     */
    private getCurrentLeverage(): number {
        // If the balance droped 30% stop the simulation
        if (this.currentChange <= -30) {
            throw new Error(`
                Closing Balance: ${this.current.toString()}$ 
                Bank Balance: ${this.bank.toNumber()}$
                Profit: ${this.bank.plus(this.current).minus(this.initial)}`);
        }
        return this.leverage;
        // if the change 
        if (this.currentChange <= 5) {
            return 5;
        }
        else if (this.currentChange > 5 && this.currentChange <= 10) {
            return 4;
        }
        else {
            return 3;
        }
    }




    










    /* Verbose */




    /**
     * Displays a summary of a balance update.
     * @param positionSize
     * @returns void
     */
    private displayBalanceUpdate(positionSize: number): void {
        // Init the record
        const h: IBalanceHistory = this.history[this.history.length -1];

        // Display Fees - Can be silenced once validated
        console.log(`Position Size: ${positionSize}$ x${this.leverage}`);
        console.log(`${h.previous}$ -> ${h.current}$ (${h.current > h.previous ? '+':'-'}${new BigNumber(h.difference).minus(h.fee.netFee).toNumber()}$)`);
        if (this.verbose > 0 && this.bank.isGreaterThan(0)) console.log(`Bank: ${this.bank.toNumber()}$`);
        if (this.verbose > 1) console.log(`Fee: ${h.fee.netFee}$ | BIF: ${h.fee.borrowInterestFee}$ | OTF: ${h.fee.openTradeFee}$ | CTF: ${h.fee.closeTradeFee}$`);
        console.log(' ');
    }





    /**
     * Displays a bank transaction
     * @param savings 
     */
    private displayBankTransaction(savings: number): void {
        console.log(' ');
        console.log(`A total of ${savings}$ has been placed in the bank account which now has a total of ${this.bank.toNumber()}$.`);
        console.log(' ');
    }



    
}