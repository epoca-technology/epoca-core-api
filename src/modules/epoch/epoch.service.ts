import {inject, injectable} from "inversify";
import { BehaviorSubject } from "rxjs";
import { environment, SYMBOLS } from "../../ioc";
import { IApiErrorService } from "../api-error";
import { IBackgroundTask, BackgroundTask, IBackgroundTaskInfo } from "../background-task";
import { IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";
import { 
    IEpochService, 
    IEpochMetricsRecord, 
    IEpochRecord, 
    IEpochValidations, 
    IEpochModel, 
    IEpochFile,
    IUnpackedEpochFile,
    IEpochPositionRecord,
    IEpochSummary,
    IEpochListItem
} from "./interfaces";




@injectable()
export class EpochService implements IEpochService {
    // Inject dependencies
    @inject(SYMBOLS.EpochValidations)           private validations: IEpochValidations;
    @inject(SYMBOLS.EpochFile)                  private file: IEpochFile;
    @inject(SYMBOLS.EpochModel)                 private model: IEpochModel;
    @inject(SYMBOLS.ApiErrorService)            private _apiError: IApiErrorService;


    /**
     * Tasks
     * Since the install/uninstall of an Epoch can take some time, it happens in the
     * background. In case there is a problem, the error will be logged in the task,
     * as well as the api errors module.
     */
    public installTask: IBackgroundTask = new BackgroundTask("Install Epoch");
    public uninstallTask: IBackgroundTask = new BackgroundTask("Uninstall Epoch");


    /**
     * Active Epoch Stream
     * undefined: The module has not been initialized.
     * null: The module has been initialized but there isn't an active epoch.
     * IEpochRecord: There is an active epoch.
     */
    public readonly active: BehaviorSubject<IEpochRecord|null|undefined> = new BehaviorSubject(undefined);


    // Active Epoch's Metrics
    private metrics: IEpochMetricsRecord|undefined = undefined;

    // Active Epoch's Positions
    private positions: IEpochPositionRecord[]|undefined = undefined;

    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;




    constructor() {}





    /* Retrievers */




    /**
     * Retrieves an Epoch Record by ID. If none is found, it returns 
     * undefined.
     * @param epochID 
     * @returns Promise<IEpochRecord|undefined>
     */
    public async getEpochRecord(epochID: string): Promise<IEpochRecord|undefined> {
        // Check if the epoch can be retrieved
        this.validations.validateEpochID(epochID);

        // Finally, return the epoch record (If any)
        return this.model.getEpochRecordByID(epochID);
    }







    /**
     * Retrieves the summary for the active Epoch. If there isn't an active
     * Epoch, it returns undefined.
     * @returns IEpochSummary|undefined
     */
    public getActiveEpochSummary(): IEpochSummary|undefined {
        // Check if there is an active epoch
        if (this.active.value) {
            return { record: this.active.value, metrics: this.metrics, positions: this.positions }
        } 

        // Otherwise, return undefined
        else { return undefined }
    }








    /**
     * Retrieves the summary for a provided Epoch ID. If the epoch
     * matches the active one, it will return the values from RAM.
     * If no epoch is found it will throw an error.
     * @param epochID 
     * @returns Promise<IEpochSummary>
     */
    public async getEpochSummary(epochID: string): Promise<IEpochSummary> {
        // Check if the summary can be retrieved
        this.validations.validateEpochID(epochID);

        // Check if the ID matches the active Epoch
        if (this.active.value && this.active.value.id == epochID) {
            return {
                record: this.active.value,
                metrics: this.metrics,
                positions: this.positions
            }
        }

        // Otherwise, download the data from the db
        else {
            // Retrieve the required data from the db
            const values: [IEpochRecord, IEpochMetricsRecord, IEpochPositionRecord[]] = await Promise.all([
                this.model.getEpochRecordByID(epochID),
                this.model.getEpochMetrics(epochID),
                this.model.getEpochPositions(epochID)
            ]);

            // Finally, return the values
            return {
                record: values[0],
                metrics: values[1],
                positions: values[2]
            }
        }
    }







    /**
     * Lists minified epoch objects based on a given point and a limit of records.
     * If no starting point is provided, it will start from the beginning.
     * @param startAt 
     * @param limit 
     * @returns Promise<IEpochListItem[]>
     */
    public async listEpochs(startAt: number, limit: number): Promise<IEpochListItem[]> {
        // Init the starting point in case it wasn't provided
        startAt = isNaN(startAt) || startAt == 0 ? undefined: startAt;

        // Validate the request
        this.validations.canListEpochs(startAt, limit);

        // Finally, return the list
        return this.model.listEpochs(startAt, limit);
    }












    /* Initializer */





    /**
     * Initializes the epoch module as well as the current 
     * configuration (if any).
     * @returns Promise<void>
     */
    public async initialize(activeRecord?: IEpochRecord|undefined): Promise<void> {
        // Initialize the active record
        activeRecord = activeRecord ? activeRecord: await this.model.getActiveEpochRecord();

        // Check if there is an active epoch
        if (activeRecord) {
            // Retrieve the general metrics and the positions
            const values: [IEpochMetricsRecord, IEpochPositionRecord[]] = await Promise.all([
                this.model.getEpochMetrics(activeRecord.id),
                this.model.getEpochPositions(activeRecord.id)
            ]);
            this.metrics = values[0];
            this.positions = values[1];

            // Broadcast the active epoch
            this.active.next(activeRecord);
        }

        // Otherwise, there is no active epoch
        else { this.stop() }
    }







    /**
     * Sets the active epoch as undefined and broadcasts it to 
     * all the modules that rely on an active epoch.
     */
    public stop(): void { 
        this.active.next(null);
        this.metrics = undefined;
        this.positions = undefined;
    }











    /* Installer */






    /**
     * Initializes a Background Task that takes care of installing an
     * Epoch.
     * @param epochID 
     */
    public async install(epochID: string): Promise<IBackgroundTaskInfo> {
        // Firstly, make sure the epoch file can be downloaded
        await this.validations.canEpochFileBeDownloaded(epochID, this.active.value);

        // Initialize the task
        this.installTask.start();

        // Initialize the process without waiting for it
        this._install(epochID);

        // Finally, return the running task
        return this.installTask.getTask();
    }





    /**
     * Executes the task that downloads, unpacks and installs
     * the epoch file. Once the installation is complete, the epoch
     * is also initialized.
     * @param epochID 
     * @returns Promise<void>
     */
    private async _install(epochID: string): Promise<void> {
        // Download the epoch file safely
        try {
            // Download and unpack the file
            this.installTask.logProgress(5, `Downloading and unpacking ${epochID}.zip`);
            const epochFile: IUnpackedEpochFile = await this.file.downloadAndUnpackEpochFile(epochID);

            // If any of the following operations fail, clean the cloud and local directories
            try {
                // Make sure the epoch can be installed
                this.installTask.logProgress(60, `Validating integrity of the Epoch File.`);
                this.validations.canEpochBeInstalled(epochID, epochFile);

                // Perform the installation
                this.installTask.logProgress(75, `Installing ${epochID}...`);
                const record: IEpochRecord = await this.model.install(
                    epochFile.epochConfig, 
                    epochFile.predictionModelCertificate, 
                    epochFile.regressionCertificates
                );

                /**
                 * Post Installation Actions
                 * Since the Epoch has already been successfully installed, perform the next actions safely.
                 * If any of them were to trigger an error, it can be fixed by simply restarting the server.
                 */
                try {
                    // Remove the cloud epoch file
                    this.installTask.logProgress(90, `Removing ${epochID}.zip from the cloud.`);
                    await this.file.cleanCloudFiles();

                    // Initialize the Epoch
                    this.installTask.logProgress(95, `Initializing ${epochID}.`);
                    await this.initialize(record);

                    // Finally, complete the task
                    this.installTask.logProgress(100);
                } catch (e) {
                    // Update the task's state
                    this.installTask.errored(e);

                    // Log the api error
                    await this._apiError.log("EpochService._install.post_actions", e, undefined, undefined, {epochID: epochID});
                }
            } catch (e) {
                // Remove the local files safely
                try { await this.file.cleanLocalFiles() } 
                catch (e) {
                    console.log("Error when cleaning the epoch's local files:", e);
                    await this._apiError.log("EpochService._install.crashed.cleanLocalFiles", e, undefined, undefined, {epochID: epochID});
                }

                // Remove the cloud files safely
                try { await this.file.cleanCloudFiles() } 
                catch (e) {
                    console.log("Error when cleaning the epoch's cloud files:", e);
                    await this._apiError.log("EpochService._install.crashed.cleanCloudFiles", e, undefined, undefined, {epochID: epochID});
                }

                // Rethrow the error
                throw e;
            }
        } catch (e) {
            // Update the task's state
            this.installTask.errored(e);

            // Log the api error
            await this._apiError.log("EpochService._install", e, undefined, undefined, {epochID: epochID});
        }
    }








    /**
     * Initializes a Background Task that takes care of uninstalling an
     * Epoch.
     * @returns Promise<IBackgroundTaskInfo> 
     */
    public async uninstall(): Promise<IBackgroundTaskInfo> {
        // Firstly make sure the epoch can be uninstalled
        await this.validations.canEpochBeUninstalled(this.active.value);

        // Initialize the task
        this.uninstallTask.start();

        // Initialize the process without waiting for it
        this._uninstall();

        // Finally, return the running task
        return this.uninstallTask.getTask();
    }





    /**
     * Executes the task that uninstalls the epoch from the system, 
     * leaving only the collected data.
     * @returns Promise<void>
     */
    private async _uninstall(): Promise<void> {
        try {
            // Firstly, uninstall the epoch
            this.uninstallTask.logProgress(5, `Uninstalling ${this.active.value.id}.`);
            await this.model.uninstall(this.active.value.id);

            // Delete the local files
            this.uninstallTask.logProgress(50, `Deleting Epoch Files.`);
            await this.file.cleanLocalFiles();

            // Deactivate the epoch
            this.uninstallTask.logProgress(85, `Deactivating ${this.active.value.id}.`);
            this.stop();

            // Finally, complete the task
            this.uninstallTask.logProgress(100);
        } catch (e) {
            // Update the task's state
            this.uninstallTask.errored(e);

            // Log the api error
            await this._apiError.log("EpochService._uninstall", e, undefined, undefined);
        }
    }








    /* Certificate Retrievers */





    /**
     * Retrieves a prediction model certificate. Throws an error if non is
     * found.
     * @param id 
     * @returns Promise<IPredictionModelCertificate>
     */
    public async getPredictionModelCertificate(id: string): Promise<IPredictionModelCertificate> {
        // Validate the request
        this.validations.validateModelID(id);

        // Return the data
        return this.model.getPredictionModelCertificate(id);
    }

    




    /**
     * Retrieves a regression certificate. Throws an error if non is
     * found.
     * @param id 
     * @returns Promise<IRegressionTrainingCertificate>
     */
     public async getRegressionCertificate(id: string): Promise<IRegressionTrainingCertificate> {
        // Validate the request
        this.validations.validateModelID(id);

        // Return the data
        return this.model.getRegressionCertificate(id);
    }
}
