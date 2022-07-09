import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { getStorage, Storage } from "firebase-admin/storage";
import {Bucket, GetFilesResponse, File, DownloadResponse} from "@google-cloud/storage";
import * as fs from "fs";
import { IDatabaseService } from "../database";
import { ICandlestick, ICandlestickModel } from "../candlestick";
import { IFileService, IFileConfig, IFileExtension } from "./interfaces";




@injectable()
export class FileService implements IFileService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;
    @inject(SYMBOLS.CandlestickModel)          private candlestickModel: ICandlestickModel;


    // Storage Bucket Instance
    private readonly storage: Storage = getStorage();
    private readonly bucket: Bucket = this.storage.bucket();



    /* Files Configuration */


    // Database Backups
    private readonly databaseBackups: IFileConfig = {
        localPath: '/var/lib/pgdata-management',
        cloudPath: 'db_backups',
        extension: 'dump',
        maxCloudFiles: 5
    }

    

    // Candlestick Spreadsheets
    private readonly candlestickSpreadsheets: IFileConfig = {
        localPath: '/var/lib/candlestick-spreadsheets',
        cloudPath: 'candlestick_spreadsheets',
        extension: 'csv',
        maxCloudFiles: 5
    }

    



    constructor() {}







    

    /* Database Backups */







    /**
     * Uploads a Database Backup to the Google Cloud.
     * @param fileName 
     * @returns Promise<void>
     */
    public async uploadDatabaseBackup(fileName: string): Promise<void> {
        return this.uploadFile(this.databaseBackups, fileName);
    }








    /**
     * Downloads a Database Backup file and places into the management
     * directory. Once the download completes, it removes the entire db
     * and then initializes it in a blank state so pg_restore can be invoked.
     * @param fileName
     * @returns Promise<void>
     */
    public async restoreDatabaseBackup(fileName: string): Promise<void> {
        // Download the file and place it in the local volume
        await this.downloadFile(this.databaseBackups.cloudPath, this.databaseBackups.localPath, fileName);

        // Delete the DB
        await this._db.deleteDatabase();

        // Initialize the DB on a blank state
        await this._db.initialize();
    }







    /**
     * Retrieves all existing files in the database management volume
     * and deletes them one by one.
     * @returns Promise<void>
     */
    public async cleanDatabaseManagementFiles(): Promise<void> {
        return this.deleteAllLocalFiles(this.databaseBackups.localPath);
    }
















    /* Candlestick Spreadsheets */






    /**
     * Generates a Candlesticks Spreadsheet based on the provided filename
     * and uploads it to Firebase Storage. 
     * Cleanup operations are performed once the file is uploaded.
     * @param fileName 
     * @returns Promise<void>
     */
    public async generateCandlesticksSpreadsheet(fileName: string): Promise<void> {
        // Create the spreadsheet
        await this.createCandlesticksSpreadsheet(fileName, true);

        // Upload it and clean up
        await this.uploadFile(this.candlestickSpreadsheets, fileName);
    }






    /**
     * Creates the Candlesticks Spreadsheet Pair for the Models program.
     * Notice that files in the volume will be cleaned before generating the
     * new pair.
     * @returns Promise<void> 
     */
    public async generateCandlesticksSpreadsheetPair(): Promise<void> {
        // Clean whatever is in the volume
        await this.deleteAllLocalFiles(this.candlestickSpreadsheets.localPath)

        // Create both files simultaneously
        await Promise.all([
            this.createCandlesticksSpreadsheet('candlesticks.csv', false),
            this.createCandlesticksSpreadsheet('forecast_candlesticks.csv', true)
        ]);
    }






    /**
     * Creates the candlestick spreadsheet inside of the local directory, making use 
     * of the latest data available.
     * @param fileName 
     * @param forecast
     * @returns Promise<void>
     */
    private async createCandlesticksSpreadsheet(fileName: string, forecast: boolean): Promise<void> {
        // Retrieve all the forecast candlesticks
        const candlesticks: ICandlestick[] = await this.candlestickModel.get(undefined, undefined, undefined, forecast);

        // Make sure candlesticks were downloaded
        if (!candlesticks.length) {
            throw new Error(`Couldnt create a candlesticks spreadsheet because the retrieved list is empty.`);
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
        await this.writeLocalFile(this.candlestickSpreadsheets.localPath, fileName, fileData);
    }





    











    /* Cloud Files Management */






    /**
     * Uploads a file to the cloud as well as cleaning the cloud and the 
     * local directory.
     * @param config 
     * @param fileName 
     * @returns Promise<void>
     */
    private async uploadFile(config: IFileConfig, fileName: string): Promise<void> {
        // Upload the File to Firebase Storage
        await this.bucket.upload(`${config.localPath}/${fileName}`, {
            destination: `${config.cloudPath}/${fileName}`,
        });

        // Clean the cloud files
        await this.cleanCloudFiles(config.cloudPath, config.extension, config.maxCloudFiles);

        // Clean the local files
        await this.deleteAllLocalFiles(config.localPath);
    }









    /**
     * Cleans outdated files from the cloud.
     * @param cloudPath 
     * @param extension 
     * @param maxFiles 
     * @returns Promise<void>
     */
     private async cleanCloudFiles(cloudPath: string, extension: IFileExtension, maxFiles: number): Promise<void> {
        // Retrieve all the cloud file names
        const cloudFiles: string[] = await this.getCloudFileNames(cloudPath, extension);

        // Build a new list with the files that can be safely deleted and do so
        const deletableFiles: string[] = cloudFiles.slice(maxFiles);
        for (let f of deletableFiles) { await this.bucket.file(`${cloudPath}/${f}`).delete() }
    }








    

    /**
     * Downloads a file from the cloud and places into the local directory's path.
     * @param origin
     * @param destination
     * @param fileName
     * @returns Promise<void>
     */
     private async downloadFile(origin: string, destination: string, fileName: string): Promise<void> {
        // Download the file and place it in the management volume
        const downloadResponse: DownloadResponse = await this.bucket.file(`${origin}/${fileName}`).download({
            destination: `${destination}/${fileName}`
        });

        // Make sure there is a response
        if (!downloadResponse) {
            throw new Error(`Google Cloud returned an invalid response when downloading ${origin}/${fileName}.`);
        }

        // Make sure the file has been placed in the local path
        const localFiles: string[] = await this.getLocalFileNames(destination);
        if (!localFiles.includes(fileName)) {
            throw new Error(`The downloaded file was not found in the local directory ${destination}/${fileName}.`);
        }
    }








    /**
     * Returns a list of Files in descending order. If no files are found, it throws an error.
     * @param cloudPath
     * @param extension
     * @returns Promise<string[]>
     */
     private async getCloudFileNames(cloudPath: string, extension: IFileExtension): Promise<string[]> {
        // Init the list
        let fileNames: string[] = [];

        // Download the db files
        const filesResponse: GetFilesResponse = await this.bucket.getFiles({
            maxResults: 1000,
            prefix: cloudPath
        });
        
        // Make sure at least 1 file was found
        if (!filesResponse || !filesResponse[0] || !filesResponse[0].length) {
            throw new Error(`The Google Cloud Download did not return valid files for ${cloudPath}.`);
        }

        // Iterate over the Google Cloud Objects and populate the file names
        for (let f of filesResponse[0]) {
            // Check if the file name can be extracted
            const name: string|undefined = this.getFileNameFromCloudObject(f, cloudPath, extension);
            if (name) fileNames.push(name);
        }

        // Sort the list
        fileNames.sort(this.sortDesc);

        // Return it
        return fileNames;
    }









    /**
     * Given a Google Cloud File, it will attempt to extract it's name. Otherwise,
     * it returns undefined.
     * @param file 
     * @param cloudPath 
     * @param extension 
     * @returns string|undefined
     */
     private getFileNameFromCloudObject(file: File, cloudPath: string, extension: IFileExtension): string|undefined {
        // Make sure the object and the name exist
        if (file && file.metadata && typeof file.metadata.name == "string" && file.metadata.name.length) {
            // Init the Full Path
            const fullPath: string[] = file.metadata.name.split('/');

            // Make sure the name includes the cloud path and the file name
            if (
                fullPath.length == 2 &&
                fullPath[0] == cloudPath && 
                typeof fullPath[1] == "string" && 
                fullPath[1].length
            ) {
                // Init the File Name
                const fileName: string[] = fullPath[1].split('.');

                // Make sure the name is a valid integer and the extension is correct
                if (
                    fileName.length == 2 &&
                    Number(fileName[0]) !== NaN &&
                    fileName[1] == extension
                ) {
                    return fullPath[1];
                } else { return undefined }
            } else { return undefined }
        } else { return undefined }
    }
















    /* Local Files Management */


    




    /**
     * Retrieves a list of all the files within a provided path.
     * @param path 
     * @returns Promise<string[]>
     */
    private getLocalFileNames(path: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(path, (error: any, files: string[]) => {
                // Handle the error
                if (error) reject(error);
    
                // Make sure a list of files has been found
                if (files && files.length) {
                    // Sort them by name in descending order and resolve them
                    files.sort(this.sortDesc);
                    resolve(files);
                } else {
                    resolve([]);
                }
            })
        });
    }







    /**
     * Writes to a local path based on provided path and name.
     * @param path 
     * @param fileName 
     * @param data 
     * @returns Promise<void>
     */
    private writeLocalFile(path: string, fileName: string, data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(`${path}/${fileName}`, data, "utf-8", (err) => {
                // Handle errors
                if (err) reject(err);

                // Resolve the promise
                resolve();
            });
        });
    }








    /**
     * Deletes all the files located in provided path.
     * @param path 
     * @returns Promise<void>
     */
    private async deleteAllLocalFiles(path: string): Promise<void> {
        // Retrieve all the file names
        const names: string[] = await this.getLocalFileNames(path);

        // Iterate over each file deleting them
        for (let n of names) { await this.deleteLocalFile(`${path}/${n}`) }
    }








    /**
     * Deletes a file located in the provided path.
     * @param path 
     * @returns Promise<void>
     */
    private deleteLocalFile(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(path, (error: any) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the promise
                resolve();
            })
        });
    }











    /* Misc Helpers */








    /**
     * Function used to order files by name in descending order.
     * @param a 
     * @param b 
     * @returns number
     */
     private sortDesc(a: string, b: string): number {
        const aTS: number = Number(a.split('.')[0]);
        const bTS: number = Number(b.split('.')[0]);
        if (aTS > bTS) { return -1 }
        else if (bTS > aTS) { return 1 }
        else { return 0 }
    }
}