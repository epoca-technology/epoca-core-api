import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { 
    IEpochConfig, 
    IPredictionModelCertificate, 
    IPredictionModelConfig, 
    IRegressionTrainingCertificate 
} from "../epoch-builder";




// Service
export interface IEpochService {
    // Properties
    active: BehaviorSubject<IEpochRecord|undefined>,
    metrics: IEpochMetricsRecord|undefined,

    // Retrievers
    // ...

    // Initializer
    initialize(): Promise<void>,
    stop(): void,

    // Installer
    install(epochID: string): Promise<void>,
    uninstall(): Promise<void>,
}



// Validations
export interface IEpochValidations {



    // Installer
    canEpochFileBeDownloaded(epochID: string): Promise<void>,
    canEpochBeInstalled(epochID: string, epochFile: IUnpackedEpochFile): void,
}




// Model
export interface IEpochModel {

    // Retrievers
    getActiveEpochRecord(): Promise<IEpochRecord|null|undefined>,
    getEpochRecordByID(epochID: string): Promise<IEpochRecord|undefined>,

    // Epoch Metrics
    getEpochMetrics(epochID: string): Promise<IEpochMetricsRecord>,
    

    // Installer
    install(
        epochConfig: IEpochConfig, 
        predictionModelCertificate: IPredictionModelCertificate,
        regressionCertificates: IRegressionTrainingCertificate[]
    ): Promise<IEpochRecord>,
    uninstall(epochID: string): Promise<void>,
}





// Epoch File
export interface IEpochFile {
    downloadAndUnpackEpochFile(epochID: string): Promise<IUnpackedEpochFile>,

}




/**
 * Unpacked Epoch File
 * During the installation process, the Epoch File is downloaded and 
 * unpacked in a volume that is shared by the Core and Prediction APIs.
 */
export interface IUnpackedEpochFile {
    epochConfig: IEpochConfig, 
    predictionModelCertificate: IPredictionModelCertificate,
    regressionCertificates: IRegressionTrainingCertificate[],
    modelFileNames: string[]
}








/**
 * Epoch Record
 * The record that wraps the epoch's configuration that comes directly
 * from the Epoch Builder.
 */
export interface IEpochRecord {
    // The identifier of the epoch
    id: string,

    // The date in which the epoch was installed
    installed: number,

    // The full configuration of the epoch
    config: IEpochConfig,

    // The configuration of the prediction model being exposed
    model: IPredictionModelConfig,

    /**
     * The date in which the epoch was uninstalled. If this value is not set,
     * it means the epoch is still active.
     */
    uninstalled?: number
}







/**
 * Epoch Metrics
 * Summary of the prediction model's performance by Epoch.
 */
 export interface IEpochMetricsRecord {
    // The identifier of the epoch
    id: string,

    // The accumulated profits in all trading sessions
    profit: number,

    // The accumulated fees in all trading sessions
    fees: number,

    // The number of longs in all trading sessions
    longs: number,
    successful_longs: number,

    // The number of shorts in all trading sessions
    shorts: number,
    successful_shorts: number,

    // The accuracy in all trading sessions
    long_accuracy: number,
    short_accuracy: number,
    accuracy: number
}





/**
 * Epoch Positions
 * The list of positions executed in the epoch. These positions serve
 * as the metrics' payload.
 */
 export interface IEpochPositionRecord {
    // The identifier of the epoch
    id: string,

    
}