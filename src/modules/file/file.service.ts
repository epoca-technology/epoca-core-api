import {inject, injectable} from "inversify";
import { getStorage, Storage } from "firebase-admin/storage";
import {Bucket, GetFilesResponse, File, DownloadResponse} from "@google-cloud/storage";
import * as fs from "fs";
import { SYMBOLS } from "../../ioc";
import { IDatabaseService } from "../database";
import { IFileService, IManagementPath, ICloudPath } from "./interfaces";




@injectable()
export class FileService implements IFileService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)           private _db: IDatabaseService;

    // Management Volume Paths
    private readonly managementPath: IManagementPath = {
        database: '/var/lib/pgdata-management',
        forecastModel: ''
    };

    // Google Cloud Paths
    private readonly cloudPath: ICloudPath = {
        database: 'db_backups',
        forecastModel: ''
    }

    // Storage Bucket Instance
    private readonly storage: Storage = getStorage();
    private readonly bucket: Bucket = this.storage.bucket();

    // Maximum amount of backups that can be stored. This value is used for file rotation.
    private readonly maxCloudDatabaseBackups: number = 5;





    
    constructor() {}







    /* Database */







    /**
     * Uploads a Database Backup to the Google Cloud.
     * @param fileName 
     * @returns Promise<void>
     */
    public async uploadDatabaseBackup(fileName: string): Promise<void> {
        // Upload the File to Firebase Storage
        await this.bucket.upload(`${this.managementPath.database}/${fileName}`, {
            destination: `${this.cloudPath.database}/${fileName}`,
        });

        // Rotate the backup files if applies
        const cloudFiles: string[] = await this.getUploadedDatabaseBackups();
        const deletableFiles: string[] = cloudFiles.slice(this.maxCloudDatabaseBackups);
        for (let f of deletableFiles) { await this.bucket.file(`${this.cloudPath.database}/${f}`).delete() }

        // Clean the Management Files
        await this.cleanDatabaseManagementFiles();
    }









    /**
     * Downloads a Database Backup file and places into the management
     * directory. Once the download completes, it removes the entire db
     * and then initializes it in a blank state so pg_restore can be invoked.
     * @param fileName
     * @returns Promise<void>
     */
    public async restoreDatabaseBackup(fileName: string): Promise<void> {
        // Download the file and place it in the management volume
        const downloadResponse: DownloadResponse = await this.bucket.file(`${this.cloudPath.database}/${fileName}`).download({
            destination: `${this.managementPath.database}/${fileName}`
        });

        // Make sure there is a response
        if (!downloadResponse) {
            throw new Error('Google Cloud returned an invalid download response when trying to restore a database backup.');
        }

        // Make sure the file has been placed in the management volume
        const managementFiles: string[] = await this.getDatabaseManagementFiles();
        if (!managementFiles.includes(fileName)) {
            throw new Error('The downloaded restore file was not found in the management volume.');
        }

        // Delete the DB
        await this._db.deleteDatabase();

        // Initialize the DB on a blank state
        await this._db.initialize();
    }






    





    /* Database Backup Cloud Files */


    /**
     * Returns a list of Database Backup Files in descending order. If no files
     * are found, it throws an error.
     * @returns Promise<string[]>
     */
    public async getUploadedDatabaseBackups(): Promise<string[]> {
        // Init the list
        let fileNames: string[] = [];

        // Download the db files
        const filesResponse: GetFilesResponse = await this.bucket.getFiles({
            maxResults: 1000,
            prefix: this.cloudPath.database
        });
        
        // Make sure at least 1 file was found
        if (!filesResponse || !filesResponse[0] || !filesResponse[0].length) {
            throw new Error('Couldnt download database backup files from Google Cloud.');
        }

        // Iterate over the Google Cloud Objects and pick the backup files
        for (let f of filesResponse[0]) {
            // Check if the file name can be extracted
            const name: string|undefined = this.getDatabaseBackupNameFromFileObject(f);
            if (name) fileNames.push(name);
        }

        // Sort the list
        fileNames.sort(this.sortDatabaseBackupFiles);

        // Return it
        return fileNames;
    }






    /**
     * Given a Google Cloud File, it will check if it is a database backup. Otherwise, it returns 
     * undefined.
     * @param file 
     * @returns string|undefined
     */
    private getDatabaseBackupNameFromFileObject(file: File): string|undefined {
        // Make sure the object and the name exist
        if (file && file.metadata && typeof file.metadata.name == "string" && file.metadata.name.length) {
            // Init the Full Path
            const fullPath: string[] = file.metadata.name.split('/');

            // Make sure the name includes the database path and the dump name
            if (
                fullPath.length == 2 &&
                fullPath[0] == this.cloudPath.database && 
                typeof fullPath[1] == "string" && 
                fullPath[1].length
            ) {
                // Init the File Name
                const fileName: string[] = fullPath[1].split('.');

                // Make sure the name is a valid integer and the extension is dump
                if (
                    fileName.length == 2 &&
                    Number(fileName[0]) !== NaN &&
                    fileName[1] == "dump"
                ) {
                    return fullPath[1];
                } else { return undefined }
            } else { return undefined }
        } else { return undefined }
    }











    /* Database Local Management Files (Volume) */






    /**
     * Retrieves all existing files in the database management volume
     * and deletes them one by one.
     * @returns Promise<void>
     */
    public async cleanDatabaseManagementFiles(): Promise<void> {
        // Retrieve the list of files
        const files: string[] = await this.getDatabaseManagementFiles();

        // There should be files in the volume
        if (!files.length) {
            throw new Error('Could not clean the database management files because the volume is empty.');
        }

        // Iterate and delete each file
        for (let f of files) { await this.deleteFile(`${this.managementPath.database}/${f}`) }
    }







    /**
     * Retrieves a list of files within the database management volume 
     * and sorts it by name in descending order.
     * @returns Promise<string[]>
     */
    private async getDatabaseManagementFiles(): Promise<string[]> {
        // Retrieve all the files
        let names: string[] = await this.getDirectoryFileNames(this.managementPath.database);

        // Sort the files in descending order so the first index is always the latest
        names.sort(this.sortDatabaseBackupFiles);

        // Return the final list
        return names;
    }











    /* Database Misc Helpers */




    /**
     * Orders the Database backup names in descending order.
     * @param a 
     * @param b 
     * @returns number
     */
    private sortDatabaseBackupFiles(a: string, b: string): number {
        const aTS: number = Number(a.split('.')[0]);
        const bTS: number = Number(b.split('.')[0]);
        if (aTS > bTS) { return -1 }
        else if (bTS > aTS) { return 1 }
        else { return 0 }
    }


















    /* Forecast Models */























    /* Volume Files Management */


    




    /**
     * Retrieves a list of all the files within a provided path.
     * @param path 
     * @returns Promise<string[]>
     */
    private getDirectoryFileNames(path: string): Promise<string[]> {
        return new Promise((resolve, reject) => {
            fs.readdir(path, (error: any, files: string[]) => {
                // Handle the error
                if (error) reject(error);
    
                // Make sure a list of files has been found
                if (files && files.length) {
                    resolve(files);
                } else {
                    resolve([]);
                }
            })
        });
    }






    /**
     * Deletes a file located in the provided path.
     * @param path 
     * @returns Promise<void>
     */
    private deleteFile(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(path, (error: any) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the promise
                resolve();
            })
        });
    }
}