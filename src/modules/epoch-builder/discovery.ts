




/* Discovery Types at _types/discovery_types.py */






/**
 * Discovery
 * The discovery contains all the prediction information of the 
 * model based on the test dataset.
 */
export interface IDiscovery {
    // Predictions generated by the model
    neutral_num: number,
    increase_num: number,
    decrease_num: number,

    // Outcomes during the discovery
    neutral_outcome_num: number,
    increase_outcome_num: number,
    decrease_outcome_num: number,

    // The points collected during the discovery
    points_hist: number[],
    points: number,

    // The accuracy of the generated predictions
    increase_accuracy: number,
    decrease_accuracy: number,
    accuracy: number,

    // Details of the increase predictions
    increase_list: number[],
    increase_min: number,
    increase_max: number,
    increase_mean: number,
    increase_median: number,

    // Details of the decrease predictions
    decrease_list: number[],
    decrease_min: number,
    decrease_max: number,
    decrease_mean: number,
    decrease_median: number,

    // Details of the successful increase predictions
    increase_successful_list: number[],
    increase_successful_mean: number,
    increase_successful_median: number,

    // Details of the unsuccessful increase predictions
    increase_unsuccessful_list: number[],
    increase_unsuccessful_mean: number,
    increase_unsuccessful_median: number,

    // Details of the successful decrease predictions
    decrease_successful_list: number[],
    decrease_successful_mean: number,
    decrease_successful_median: number,

    // Details of the unsuccessful decrease predictions
    decrease_unsuccessful_list: number[],
    decrease_unsuccessful_mean: number,
    decrease_unsuccessful_median: number
}