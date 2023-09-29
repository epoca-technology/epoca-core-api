


// Service
export interface IVolumeService {
    state: IVolumeState,
    calculateState(): IVolumeStateIntensity
    getDefaultState(): IVolumeStateIntensity,
}


// Model
export interface IVolumeModel {

}



// Validations
export interface IVolumeValidations {
    
}






/**
 * Requirements
 * The requirements object that is recalculated often and is used to determine if the volume is
 * currently high, as well as the intensity.
 */
export interface IVolumeStateRequirements {
    // The USDT requirements for the volume to have a state. The higher the value the higher the intensity
    mean: number,
    meanMedium: number,
    meanHigh: number,
    meanUltraHigh: number,

    // The time at which the requirements need to be recalculated
    nextRequirementCalculation: number
}




/**
 * Volume State Intensity
 * The intensity of the volume's state based on the requirements.
 */
export type IVolumeStateIntensity = 0|1|2|3|4;





/**
 * State
 * The volume state is calculated, the result is the following object.
 */
export interface IVolumeState {
    // The state of the volume
    s: IVolumeStateIntensity,

    // The requirements for the volume to have a state
    m: number,      // Mean
    mm: number,     // Mean Medium
    mh: number,     // Mean High
    muh: number,    // Mean Ultra High

    // The volume within the current 1m interval
    v: number
}
