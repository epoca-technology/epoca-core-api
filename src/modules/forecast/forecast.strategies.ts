import { IStrategy, IStrategyID } from "./interfaces";







/**
 * Given an ID it will retrieve the strategy's data.
 * @param id 
 * @returns IStrategy
 */
export function getStrategy(id: IStrategyID): IStrategy {
    if (STRATEGIES[id]) {
        return STRATEGIES[id];
    } else {
        throw new Error(`The provided Strategy ID (${id}) is invalid.`);
    }
}





/* List of Strategies */
const STRATEGIES: {[strategyID: string]: IStrategy} = {
    // Custom
    "CUSTOM": { minReversals: 1, respectReversalType: true, allowMutations: true, moreVolumeThanNext: true},

    // Follow Price
    "FP": { minReversals: 1, followPrice: true}, // Failed
    "FP_MRTN": { minReversals: 1, followPrice: true, moreVolumeThanNext: true},

    // Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | Act on Less Volume Than Next
    "T_1R_RTM_AOLVTN": { minReversals: 1, respectReversalType: true, allowMutations: true, actOnLessVolumeThanNext: true}, // 

    // Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | More Volume Than Next
    "T_1R_RTM_MVTN": { minReversals: 1, respectReversalType: true, allowMutations: true, moreVolumeThanNext: true}, // Failed

    // Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | Act on Less Reversals Than Next
    "T_1R_RTM_AOLRTN": { minReversals: 1, respectReversalType: true, allowMutations: true, actOnLessReversalsThanNext: true}, // 

    // Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations | More Reversals Than Next
    "T_1R_RTM_MRTN": { minReversals: 1, respectReversalType: true, allowMutations: true, moreReversalsThanNext: true}, // Failed
    "T_2R_RTM_MRTN": { minReversals: 2, respectReversalType: true, allowMutations: true, moreReversalsThanNext: true}, // Failed
    "T_3R_RTM_MRTN": { minReversals: 3, respectReversalType: true, allowMutations: true, moreReversalsThanNext: true}, // Failed
    "T_4R_RTM_MRTN": { minReversals: 4, respectReversalType: true, allowMutations: true, moreReversalsThanNext: true},
    "T_5R_RTM_MRTN": { minReversals: 5, respectReversalType: true, allowMutations: true, moreReversalsThanNext: true},

    // Touch With Minimum Reversals | Respecting Reversal Type | Allowing Mutations
    "T_1R_RTM": { minReversals: 1, respectReversalType: true, allowMutations: true}, // Failed
    "T_2R_RTM": { minReversals: 2, respectReversalType: true, allowMutations: true}, // Failed
    "T_3R_RTM": { minReversals: 3, respectReversalType: true, allowMutations: true}, // Failed
    "T_4R_RTM": { minReversals: 4, respectReversalType: true, allowMutations: true}, // Failed
    "T_5R_RTM": { minReversals: 5, respectReversalType: true, allowMutations: true},

    // Touch With Minimum Reversals | Respecting Reversal Type
    "T_1R_RT": { minReversals: 1, respectReversalType: true}, // Failed
    "T_2R_RT": { minReversals: 2, respectReversalType: true}, // Failed
    "T_3R_RT": { minReversals: 3, respectReversalType: true}, // Failed
    "T_4R_RT": { minReversals: 4, respectReversalType: true}, // Failed
    "T_5R_RT": { minReversals: 5, respectReversalType: true}, // Failed - This one ran for over a year but made no money

    // Touch With Minimum Reversals
    "T_1R": { minReversals: 1}, // Failed
    "T_2R": { minReversals: 2}, // Failed
    "T_3R": { minReversals: 3}, // Failed
    "T_4R": { minReversals: 4}, // Failed
    "T_5R": { minReversals: 5}, // Failed
}




