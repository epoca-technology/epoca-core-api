import { ISplitStateSeriesItem, ISplitStates, IStateType } from "../_shared";

// Service
export interface ICoinsService {
    // Properties
    config: ICoinsConfiguration,
    
    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Coin Management
    getInstalledCoin(symbol: string): ICoin,
    getInstalledCoinAndPrice(symbol: string): {coin: ICoin, price: number},
    getCoinsSummary(): ICoinsSummary,
    installCoin(symbol: string): Promise<ICoinsSummary>,
    uninstallCoin(symbol: string): Promise<ICoinsSummary>,

    // State Calculations
    calculateState(): { coins: ICoinsState, coinsBTC: ICoinsState },
    getCoinFullState(symbol: string, btcPrice?: boolean|string): ICoinState,
    getCoinsCompressedState(): ICoinsCompressedState,
    getCoinsBTCCompressedState(): ICoinsCompressedState,
    getDefaultState(): { coins: ICoinsState, coinsBTC: ICoinsState },

    // Configuration Management
    updateConfiguration(newConfiguration: ICoinsConfiguration): Promise<void>
}




// Model
export interface ICoinsModel {
    // Coin Installation Management
    getInstalledCoins(): Promise<ICoinsObject|undefined>,
    createInstalledCoins(coins: ICoinsObject): Promise<void>,
    updateInstalledCoins(coins: ICoinsObject): Promise<void>,

    // Configuration Record Management
    getConfigurationRecord(): Promise<ICoinsConfiguration|undefined>,
    createConfigurationRecord(defaultConfiguration: ICoinsConfiguration): Promise<void>,
    updateConfigurationRecord(newConfiguration: ICoinsConfiguration): Promise<void>
}






// Validatinos
export interface ICoinsValidations {
    // General
    validateSymbol(symbol: string): void,

    // Configuration Management
    validateConfiguration(newConfiguration: ICoinsConfiguration): void
}








/**
 * Configuration
 * The Coins' Module Configuration that can be managed from the GUI.
 */
export interface ICoinsConfiguration {
    // The duration of the interval that refreshes the supported coins
    supportedCoinsIntervalHours: number,

    // The number of items that comprise the window
    priceWindowSize: number,

    // The number of seconds that will comprise each interval
    priceIntervalSeconds: number,

    // The % change required for the window splits to have a state (1 or -1)
    requirement: number,

    // The % change required for the window splits to have a strong state (2 or -2)
    strongRequirement: number
}







/* Coins */


// The record of a coin
export interface ICoin {
    // The symbol|pair that identifies the coin.
    symbol: string, // "BTCUSDT"|"ETHUSDT"|"BCHUSDT"...

    // The decimal precision to be applied to the coin's price
    pricePrecision: number, // BTC: 2

    // The decimal precision to be applied to the coin's quantity
    quantityPrecision: number // BTC: 3
}


// The object containing all supported or installed coins
export interface ICoinsObject {
    [symbol: string]: ICoin
}

// The object containing all the scores by symbol
export type ICoinScore = 1|2|3|4|5;
export interface ICoinsScores {
    [symbol: string]: ICoinScore
}

// The object containing the installed & supported coins
export interface ICoinsSummary {
    installed: ICoinsObject,
    supported: ICoinsObject,
    scores: ICoinsScores
}





/* State */



// Full Coin State
export interface ICoinState {
    // The state of the coin
    s: IStateType,

    // The split states payload
    ss: ISplitStates,

    // The coin prices within the window
    w: ISplitStateSeriesItem[]
}


// Minified Coin State
export interface IMinifiedCoinState {
    // The state of the coin
    s: IStateType,
}



// State Object
export interface ICoinsState {
    // States By Symbol
    sbs: {[symbol: string]: IMinifiedCoinState},

    // Coins Direction
    cd: IStateType
}




// Compressed State
export interface ICoinCompressedState {
    // The state of the coin
    s: IStateType,

    // The split states payload
    ss: ISplitStates,
}
export interface ICoinsCompressedState {
    // Compressed states by symbol
    csbs: {[symbol: string]: ICoinCompressedState},

    // Coins Direction
    cd: IStateType
}