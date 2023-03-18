import {inject, injectable} from "inversify";
import { BigNumber } from "bignumber.js";
import { SYMBOLS } from "../../ioc";
import { 
    IBinanceActivePosition, 
    IBinanceBalance, 
    IBinanceService, 
} from "../binance";
import { IApiErrorService } from "../api-error";
import { IUtilitiesService } from "../utilities";
import { 
    IAccountBalance,
    IActivePosition,
    IPositionModel,
    IPositionService,
    IPositionStrategy,
    IPositionValidations,
} from "./interfaces";




@injectable()
export class PositionService implements IPositionService {
    // Inject dependencies
    @inject(SYMBOLS.BinanceService)             private _binance: IBinanceService;
    @inject(SYMBOLS.PositionValidations)        private _validations: IPositionValidations;
    @inject(SYMBOLS.PositionModel)              private _model: IPositionModel;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;



    /**
     * Strategy
     * The strategy that will folowed in order to operate.
     */
    public strategy: IPositionStrategy;




    /**
     * Active Position
     * When a position is opened, it is tracked and managed by the system.
     * Due to the high volatility, the active position is refreshed
     * frequently.
     */
    public active: IActivePosition|null;
    private activePositionsSyncInterval: any;
    private readonly activePositionsIntervalSeconds: number = 2; // Every ~2 seconds




    /**
     * Futures Account Balance
     * In order for members to be trully involved, the balance is synced
     * every certain period of time.
     */
    public balance: IAccountBalance;
    private balanceSyncInterval: any;
    private readonly balanceIntervalSeconds: number = 60 * 120; // Every ~2 hours







    constructor() {}














    /***************
     * Initializer *
     ***************/




    /**
     * Initializes the position module as well as the active
     * positions.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the default balance
        this.setDefaultBalance();

        // Initialize the strategy
        await this.initializeStrategy();

        // Initialize the data
        await this.refreshActivePosition();

        // Initialize the intervals
        this.activePositionsSyncInterval = setInterval(async () => {
            try { await this.refreshActivePosition() } catch (e) { 
                this._apiError.log("PositionService.interval.refreshActivePosition", e);
            }
        }, this.activePositionsIntervalSeconds * 1000);
        this.balanceSyncInterval = setInterval(async () => {
            try { await this.refreshBalance() } catch (e) { 
                this._apiError.log("PositionService.interval.refreshBalance", e);
                this.setDefaultBalance();
            }
        }, this.balanceIntervalSeconds * 1000);
    }







    /**
     * Stops the position module entirely.
     */
    public stop(): void { 
        if (this.activePositionsSyncInterval) clearInterval(this.activePositionsSyncInterval);
        this.activePositionsSyncInterval = undefined;
        if (this.balanceSyncInterval) clearInterval(this.balanceSyncInterval);
        this.balanceSyncInterval = undefined;
    }






















    /******************************
     * Active Position Management *
     ******************************/







    /**
     * Retrieves the active position and handles it accordingly.
     * @returns Promise<void>
     */
    private async refreshActivePosition(): Promise<void> {
        // Retrieve the position
        const position: IBinanceActivePosition[] = await this._binance.getActivePositions();

        // ...
        this.active = null;
    }


















    





















    /*********************
     * Position Strategy *
     *********************/




    /**
     * Initializes the position strategy. In case it hadn't been,
     * it will create it.
     */
    private async initializeStrategy(): Promise<void> {
        this.strategy = await this._model.getStrategy();
        if (!this.strategy) {
            this.strategy = this.getDefaultStrategy();
            await this._model.createStrategy(this.strategy);
        }
    }







    /**
     * Updates the current trading strategy.
     * @param newStrategy 
     * @returns Promise<void>
     */
    public async updateStrategy(newStrategy: IPositionStrategy): Promise<void> {
        // Make sure it can be updated
        this._validations.canStrategyBeUpdated(newStrategy);

        // Update the record
        await this._model.updateStrategy(newStrategy);

        // Update the local strategy
        this.strategy = newStrategy;
    }







    /**
     * Builds the default strategy object in case it hasn't 
     * yet been initialized.
     * @returns IPositionStrategy
     */
    private getDefaultStrategy(): IPositionStrategy {
        return {
            long_status: false,
            short_status: false,
            leverage: 3,
            position_size: 25,
            positions_limit: 1,
            take_profit_1: { price_change_requirement: 0.5,     max_gain_drawdown: -15 },
            take_profit_2: { price_change_requirement: 1.25,    max_gain_drawdown: -7.5 },
            take_profit_3: { price_change_requirement: 2,       max_gain_drawdown: -5 },
            stop_loss: 0.5
        }
    }









    













    /***************************
     * Futures Account Balance *
     ***************************/





    /**
     * Retrieves the current futures account balance and
     * updates the local property.
     * @returns Promise<void>
     */
    private async refreshBalance(): Promise<void> {
        // Retrieve the account balances
        let balances: IBinanceBalance[] = await this._binance.getBalances();

        // Filter all the balances except for USDT
        balances = balances.filter((b) => b.asset == "USDT");
        if (balances.length != 1) {
            console.log(balances);
            throw new Error(this._utils.buildApiError(`The USDT balance could not be retrieved from the Binance API. Received ${balances.length}`, 29001));
        }

        // Ensure all the required properties have been extracted
        if (typeof balances[0].availableBalance != "string" || typeof balances[0].balance != "string") {
            throw new Error(this._utils.buildApiError(`The extracted USDT balance object is not complete. 
            Available ${balances[0].availableBalance} | Balance: ${balances[0].balance}`, 29002));
        }

        // Calculate the balance
        const available: BigNumber = new BigNumber(balances[0].availableBalance);
        const total: BigNumber = new BigNumber(balances[0].balance);

        // Update the local property
        this.balance = {
            available: <number>this._utils.outputNumber(available),
            on_positions: <number>this._utils.outputNumber(total.minus(available)),
            total: <number>this._utils.outputNumber(total),
            ts: balances[0].updateTime || Date.now()
        };
    }




    /**
     * Builds the default Binance Balance object and sets it on the local property.
     * @returns Promise<IBinanceBalance[]>
     */
    private setDefaultBalance(): void {
        this.balance = {
            available: 0,
            on_positions: 0,
            total: 0,
            ts: Date.now()
        };
    }
}
