import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IApiErrorService } from "../api-error";
import { ICloudFile, IFileExtension, IFileManagerService } from "../file-manager";
import { IBackgroundTask, BackgroundTask, IBackgroundTaskInfo } from "../background-task";
import { ICandlestickFileService, ICandlestick, ICandlestickModel } from "./interfaces";


@injectable()
export class CandlestickFileService implements ICandlestickFileService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.CandlestickModel)                   private _candlestickModel: ICandlestickModel;
    @inject(SYMBOLS.FileManagerService)                 private _file: IFileManagerService;

    // Local Management Path
    private readonly localPath: string = "/var/lib/candlestick-files-management";

    // Cloud Paths
    private readonly predictionCloudPath: string = "prediction_candlesticks";
    private readonly bundleCloudPath: string = "candlesticks_bundle";

    // Max Cloud Files
    private readonly maxPredictionFiles: number = 5;
    private readonly maxBundleFiles: number = 3;

    // Tasks
    public preditionFileTask: IBackgroundTask = new BackgroundTask("Prediction Candlesticks File");
    public bundleFileTask: IBackgroundTask = new BackgroundTask("Candlesticks Bundle File");


    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;




    
    constructor() {}





    /* Prediction Candlesticks File */





    /**
     * Creates the background task that will manage the building and uploading
     * of the prediction candlesticks file.
     * @returns IBackgroundTaskInfo
     */
    public generatePredictionCandlesticksFile(): IBackgroundTaskInfo {
        // Make sure that neither of the tasks is running
        this.canGenerateFile();

        // Initialize the task
        this.preditionFileTask.start();

        // Initialize the process without waiting for it
        this._generatePredictionCandlesticksFile();

        // Return the running task
        return this.preditionFileTask.getTask();
    }





    /**
     * Executes the prediction candlesticks file generation in a safe way. If there
     * is an issue during the process, the task will be marked as errored and the
     * API Error will be logged.
     * @returns Promise<void>
     */
    private async _generatePredictionCandlesticksFile(): Promise<void> {
        try {
            // Init values
            const extension: IFileExtension = "csv";
            const fileName: string = this.generateFileName(extension);
            const localPath: string = `${this.localPath}/${fileName}`;
            const cloudPath: string = `${this.predictionCloudPath}/${fileName}`;

            // Build the file and save it in the local volume
            this.preditionFileTask.logProgress(5, "Building and saving the candlesticks file in the local volume.");
            await this.buildAndSaveCandlesticksFile(localPath, true);

            // Upload the file to the cloud
            this.preditionFileTask.logProgress(10, "Uploading the prediction candlesticks file to the cloud.");
            const uploaded: ICloudFile = await this._file.uploadFile(localPath, cloudPath, extension);

            // Clean the cloud path
            this.preditionFileTask.logProgress(75, "Cleaning older cloud files.");
            await this._file.cleanCloudFiles(this.predictionCloudPath, extension, this.maxPredictionFiles);

            // Clean the local volume
            this.preditionFileTask.logProgress(95, "Cleaning the local management directory.");
            await this._file.cleanPath(this.localPath);

            // Process Completed
            this.preditionFileTask.logProgress(100);
        } catch (e) {
            // Update the task's state
            this.preditionFileTask.errored(e);

            // Log the api error
            await this._apiError.log("CandlestickFileService._generatePredictionCandlesticksFile", e);
        }
    }







    /* Candlesticks Bundle File */





    /**
     * Creates the background task that will manage the building and uploading
     * of the candlesticks bundle file.
     * @returns IBackgroundTaskInfo
     */
     public generateCandlesticksBundleFile(): IBackgroundTaskInfo {
        // Make sure that neither of the tasks is running
        this.canGenerateFile();

        // Initialize the task
        this.bundleFileTask.start();

        // Initialize the process without waiting for it
        this._generateCandlesticksBundleFile();

        // Return the running task
        return this.bundleFileTask.getTask();
    }






    /**
     * Executes the candlesticks bundle file generation in a safe way. If there
     * is an issue during the process, the task will be marked as errored and the
     * API Error will be logged.
     * @returns Promise<void>
     */
     private async _generateCandlesticksBundleFile(): Promise<void> {
        try {
            // Init values
            const extension: IFileExtension = "zip";
            const fileName: string = this.generateFileName(extension);
            const rawDirName: string = "candlesticks";
            const rawDirPath: string = `${this.localPath}/${rawDirName}`;
            const candlesticksFileName: string = "candlesticks.csv";
            const predictionCandlesticksFileName: string = "prediction_candlesticks.csv";
            const localPath: string = `${this.localPath}/${fileName}`;
            const cloudPath: string = `${this.bundleCloudPath}/${fileName}`;

            // Create the directory that will be zipped
            this.bundleFileTask.logProgress(5, "Creating the directory in which the candlesticks bundle will be placed prior to zipping.");
            await this._file.makeDirectory(rawDirPath);

            // Generate both candlestick files and place them into the directory
            this.bundleFileTask.logProgress(10, "Building and saving both candlestick files.");
            await Promise.all([
                this.buildAndSaveCandlesticksFile(`${rawDirPath}/${candlesticksFileName}`, false),
                this.buildAndSaveCandlesticksFile(`${rawDirPath}/${predictionCandlesticksFileName}`, true)
            ]);

            // Zip the candlesticks directory
            this.bundleFileTask.logProgress(10, "Zipping Candlesticks Bundle.");
            await this._file.zipData(rawDirPath, localPath, rawDirName);

            // Upload the file to the cloud
            this.bundleFileTask.logProgress(10, "Uploading the candlesticks bundle file to the cloud.");
            const uploaded: ICloudFile = await this._file.uploadFile(localPath, cloudPath, extension);

            // Clean the cloud path
            this.bundleFileTask.logProgress(75, "Cleaning older cloud files.");
            await this._file.cleanCloudFiles(this.bundleCloudPath, extension, this.maxBundleFiles);

            // Clean the local volume
            this.bundleFileTask.logProgress(95, "Cleaning the local management directory.");
            await this._file.cleanPath(this.localPath);

            // Process Completed
            this.bundleFileTask.logProgress(100);
        } catch (e) {
            // Update the task's state
            this.bundleFileTask.errored(e);

            // Log the api error
            await this._apiError.log("CandlestickFileService._generateCandlesticksBundleFile", e);
        }
    }











    /* Candlesticks CSV Builder */



    /**
     * Creates the candlestick csv file inside of the local directory, making use 
     * of the latest data available.
     * @param path 
     * @param prediction
     * @returns Promise<void>
     */
     private async buildAndSaveCandlesticksFile(path: string, prediction: boolean): Promise<void> {
        // Retrieve all the prediction candlesticks
        const candlesticks: ICandlestick[] = await this._candlestickModel.get(undefined, undefined, undefined, prediction);

        // Make sure candlesticks were downloaded
        if (!candlesticks.length) {
            throw new Error(this._utils.buildApiError(`Couldnt build a candlesticks csv file because the retrieved list is empty.`, 1500));
        }

        // Build the file data
        let fileData: string = `${Object.keys(candlesticks[0]).join(',')}\n`;
        for (let i = 0; i < candlesticks.length; i++) {
            // Append the candlestick
            fileData += Object.values(candlesticks[i]).join(',');

            // Add a new line unless it is the last record
            if (i != candlesticks.length - 1) {
                fileData += '\n';
            }
        }

        // Create the file
        await this._file.writeLocalFile(path, fileData);
    }









    /* Misc Helpers */

    



    /**
     * Verifies if a file can be generated. Throws an error if there is a 
     * task running.
     */
    private canGenerateFile(): void {
        if (this.preditionFileTask.getTask().state == "running" || this.bundleFileTask.getTask().state == "running") {
            throw new Error(this._utils.buildApiError(`The candlesticks file cannot be generated because there is a task running.`, 1501))
        }
    }







    /**
     * Generates a file name based on an extension and the current time.
     * @param ext 
     * @returns string
     */
    private generateFileName(ext: IFileExtension): string {
        return `${Date.now()}.${ext}`;
    }
}