



// Service
export interface ILiquidityService {
    // Properties
    config: ILiquidityConfiguration,
    state: IFullLiquidityState,

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // State Calculation
    calculateState(currentPrice: number): ILiquidityState,
    getMinifiedState(appBulkStreamFormat?: boolean): IMinifiedLiquidityState,
    getDefaultState(): ILiquidityState,

    // Configuration Management
    updateConfiguration(newConfiguration: ILiquidityConfiguration): Promise<void>
}


// Model
export interface ILiquidityModel {
    getConfigurationRecord(): Promise<ILiquidityConfiguration|undefined>,
    createConfigurationRecord(defaultConfiguration: ILiquidityConfiguration): Promise<void>,
    updateConfigurationRecord(newConfiguration: ILiquidityConfiguration): Promise<void>
}



// Validations
export interface ILiquidityValidations {
    validateConfiguration(newConfiguration: ILiquidityConfiguration): void
}







/**
 * Liquidity Intensity
 * The intensity of the liquidity within a price level.
 */
export type ILiquidityIntensity = 0|1|2|3|4;



/**
 * Liquidity Intensity Weights
 * The weights that will be used to determine the value of each intensity
 * when calculating the state.
 */
export interface ILiquidityIntensityWeights {
    1: number,
    2: number,
    3: number,
    4: number,
}



/**
 * Liquidity Configuration
 * The Liquidity' Module Configuration that can be managed from the GUI.
 */
export interface ILiquidityConfiguration {
    // The minimum intensity that will be included in the AppBulk Stream
    appbulk_stream_min_intensity: ILiquidityIntensity,

    /**
     * The max distance% a peak can be from the price. Peaks beyond this 
     * value are ignored.
     */
    max_peak_distance_from_price: number,

    /**
     * The weights by intensity that will be used to calculate the state
     */
    intensity_weights: ILiquidityIntensityWeights,
}




/**
 * Liquidity Intensity Requirements
 * For a price level to have intensity and be considered a "peak", it needs to be greater 
 * than or equals than the requirements. Otherwise, the intensity will be 0.
 */
export interface ILiquidityIntensityRequirements {
    low: number,        // 1
    medium: number,     // 2
    high: number,       // 3
    veryHigh: number    // 4
}





/**
 * Liquidity Peaks Price Range
 * The price range used to select the peaks that will be used to calculate the bid 
 * liquidity power as well as the price levels that will be included in the state.
 */
export interface ILiquidityPeaksPriceRange {
    // The current market price
    current: number,

    // The upper band used to select the ask peaks (current + max_peak_distance_from_price%)
    upper: number,

    // The lower band used to select the bid peaks (current - max_peak_distance_from_price%)
    lower: number
}





/**
 * Liquidity Raw Orders
 * The orders are managed in a local object that is updated when synced and by 
 * the websocket connection.
 */
export interface ILiquidityRawOrders {[price: string]: string}; // price: liquidity





/**
 * Liquidity Side
 * The order book is comprised by asks (Sell Orders) and bids (Buy Orders).
 * Asks are ordered by price from low to high while bids from high to low.
 */
export type ILiquiditySide = "asks"|"bids";






/**
 * Liquidity Price Level
 * The record containing all relevant information regarding a price level.
 */
export interface ILiquidityPriceLevel {
    // The level's price
    p: number,

    // The BTC liquidity within the level
    l: number,

    // The liquidity intensity within the level
    li: ILiquidityIntensity
}







/**
 * Liquidity Side Build
 * When the order book is retrieved in a raw format, it is processed by unit.
 * When calculating the current state of the liquidity, only price levels
 * before or after the current market price will be included.
 */
export interface ILiquiditySideBuild {
    // The total liquidity accumulated in all levels
    t: number,

    // The list of price levels
    l: ILiquidityPriceLevel[]
}











/**
 * Liquidity Peaks
 * The peaks object containing the price as keys and the intensities as 
 * values.
 */
export interface ILiquidityPeaks { [price: number]: ILiquidityIntensity };



/**
 * Liquidity Peaks' State
 * Whenever the state is being calculated, the liquidity peaks nearby the
 * price are selected and evaluated.
 */
export interface ILiquidityPeaksState {
    // The point shares accumulated by the bids against the asks
    bidLiquidityPower: number,

    // The ask peaks nearby the price
    askPeaks: ILiquidityPeaks,

    // The bid peaks nearby the price 
    bidPeaks: ILiquidityPeaks,
}



/**
 * Minified Liquidity State
 * The minified state object containing only the most essential data.
 */
export interface IMinifiedLiquidityState {
    /**
     * Bid Liquidity Power
     * When the peaks have been identified, the total accumulated value per side will
     * be compared and the BLP will be the bid% out of the total points accumulated
     * by both sides (Based on the intensity weights). 
     * If the BLP is greater than 50, means there peaks are stronger on the bids.
     */
    blp: number,

    /**
     * Liquidity Peaks
     * All the peaks with intensity >= 1 and within the max_peak_distance_from_price% (if any)
     * will be included in these lists.
     */
    ap: ILiquidityPeaks, // Ask Peaks
    bp: ILiquidityPeaks, // Bid Peaks
}





/**
 * Liquidity State
 * The full state of the liquidity. This object can be queried through the endpoint or
 * used by any other module.
 */
export interface ILiquidityState extends IMinifiedLiquidityState {
    /**
     * The liquidity builds by side based on the current price, ordered accordingly:
     * - Asks are ordered by price from low to high
     * - Bids are ordered by price from high to low
     */
    a: ILiquiditySideBuild, // Asks
    b: ILiquiditySideBuild, // Bids
}




/**
 * Liquidity Full State
 * The full liquidity state used to be able to visualize all the data from the GUI.
 */
export interface IFullLiquidityState extends ILiquidityState {
    /**
     * The peaks price range, used to select the peaks from the liquidity that will
     * be used to calculate the state.
     */
    ppr: ILiquidityPeaksPriceRange,

    /**
     * The requirements calculated making use of the whole book by side, useful to
     * determine the price levels with liquidity peaks.
     */
    r: ILiquidityIntensityRequirements,

    // The timestamp in ms in which the liquidity was last built
    ts: number
}