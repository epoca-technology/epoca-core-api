import { BehaviorSubject } from "rxjs/internal/BehaviorSubject";
import { IBackgroundTask, IBackgroundTaskInfo } from "../background-task";
import { 
    IEpochConfig, 
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
    getEpochRecord(epochID: string, validateExistance?: boolean): Promise<IEpochRecord|undefined>,
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
 * Epoch List Item
 * All the epochs can be visualized simultaneously in a list containing a very
 * brief summary.
 */
export interface IEpochListItem {
    // The identifier of the Epoch
    id: string,

    // The date in which was installed
    installed: number,

    // The date in which it was uninstalled
    uninstalled: number|undefined
}