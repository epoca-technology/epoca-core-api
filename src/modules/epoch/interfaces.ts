import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { IBackgroundTask, IBackgroundTaskInfo } from "../background-task";
import { 
    IEpochConfig, 
    IPositionType, 
    IPredictionModelCertificate, 
    IPredictionModelConfig, 
    IRegressionTrainingCertificate 
} from "../epoch-builder";




// Service
export interface IEpochService {
    // Properties
    installTask: IBackgroundTask,
    uninstallTask: IBackgroundTask,
    active: BehaviorSubject<IEpochRecord|undefined>,

    // Retrievers
    getEpochRecord(epochID: string): Promise<IEpochRecord|undefined>,
    getActiveEpochSummary(): IEpochSummary|undefined,
    getEpochSummary(epochID: string): Promise<IEpochSummary>,
    listEpochs(startAt: number, limit: number): Promise<IEpochListItem[]>,

    // Initializer
    initialize(activeRecord?: IEpochRecord|undefined): Promise<void>,
    stop(): void,

    // Installer
    install(epochID: string): Promise<IBackgroundTaskInfo>,
    uninstall(): Promise<IBackgroundTaskInfo>,

    // Certificate Retrievers
    getPredictionModelCertificate(id: string): Promise<IPredictionModelCertificate>,
    getRegressionCertificate(id: string): Promise<IRegressionTrainingCertificate>
}



// Validations
export interface IEpochValidations {
    // Retrievers
    canListEpochs(startAt: number|undefined, limit: number): void,

    // Installer
    canEpochFileBeDownloaded(epochID: string, activeEpoch: IEpochRecord|null): Promise<void>,
    canEpochBeInstalled(epochID: string, epochFile: IUnpackedEpochFile): void,
    canEpochBeUninstalled(activeEpoch: IEpochRecord|null): Promise<void>,

    // Shared
    validateEpochID(epochID: string): void,
    validateModelID(modelID: string): void
}




// Model
export interface IEpochModel {
    // Retrievers
    getActiveEpochRecord(): Promise<IEpochRecord|null|undefined>,
    getEpochRecordByID(epochID: string): Promise<IEpochRecord|undefined>,
    listEpochs(startAt: number|undefined, limit: number): Promise<IEpochListItem[]>,

    // Epoch Metrics
    getEpochMetrics(epochID: string): Promise<IEpochMetricsRecord>,
    getEpochPositions(epochID: string): Promise<IEpochPositionRecord[]>,
    updateEpochMetrics(epochID: string, newMetrics: IEpochMetricsRecord, position: IEpochPositionRecord): Promise<void>,

    // Installer
    install(
        epochConfig: IEpochConfig, 
        predictionModelCertificate: IPredictionModelCertificate,
        regressionCertificates: IRegressionTrainingCertificate[]
    ): Promise<IEpochRecord>,
    uninstall(epochID: string): Promise<void>,

    // Certificate Retrievers
    getPredictionModelCertificate(id: string): Promise<IPredictionModelCertificate>,
    getRegressionCertificate(id: string): Promise<IRegressionTrainingCertificate>
}





// Epoch File
export interface IEpochFile {
    downloadAndUnpackEpochFile(epochID: string): Promise<IUnpackedEpochFile>,
    cleanLocalFiles(): Promise<void>,
    cleanCloudFiles(): Promise<void>
}







/**
 * Unpacked Epoch File
 * During the installation process, the Epoch File is downloaded and 
 * unpacked in a volume that is shared by the Core and Prediction APIs.
 */
export interface IUnpackedEpochFile {
    // The configuration of the Epoch
    epochConfig: IEpochConfig, 

    // The Prediction Model's Certificate
    predictionModelCertificate: IPredictionModelCertificate,

    // The list of Regression Certificates
    regressionCertificates: IRegressionTrainingCertificate[],

    // The list of model files that were unpacked
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
    eid: string, // Epoch ID

    // The identifier of the trading session position
    pid: string, // Trading Session Position ID

    // The date range of the position
    ot: number, // Open Time
    ct: number, // Close Time

    // The type of position. 1 = long, -1 = short
    t: IPositionType,

    // The outcome of the position. True = Successful, False = Unsuccessful
    o: boolean,

    // The mean of the prices received when opening and closing the position
    opm: number, // Open Price Mean
    cpm: number, // Close Price Mean

    // The position's total fees
    f: number,

    // The position's net profit. In case it was unsuccessful, this value will be negative.
    p: number
}






/**
 * Epoch Summary
 * An object containing the configuration and the general performance of the Epoch.
 */
export interface IEpochSummary {
    // The Epoch Record
    record: IEpochRecord,

    // The Epoch Metrics Record
    metrics: IEpochMetricsRecord,

    // The list of Epoch Positions
    positions: IEpochPositionRecord[]
}





/**
 * Epoch List Item
 * All the epochs can be visualized simultaneously in a list containing a very
 * brief summary.
 */
export interface IEpochListItem {
    // The identifier of the Epoch
    id: string,

    // The date in which was installed
    installed: number,

    // The net profit (so far, if the epoch is active)
    profit: number
}