import {inject, injectable} from "inversify";
import { getStorage } from "firebase-admin/storage";
import {Bucket, GetFilesResponse} from "@google-cloud/storage";
import * as fs from "fs";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IFileService, IManagementPath, IDestinationPath } from "./interfaces";




@injectable()
export class FileService implements IFileService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;


    // Bucket
    private readonly bucket: Bucket = getStorage().bucket();

    // Management Volume Paths
    private readonly managementPath: IManagementPath = {
        database: '/var/lib/pgdata-management',
        forecastModel: ''
    };

    // Destination Paths
    private readonly destinationPath: IDestinationPath = {
        database: 'db_backups',
        forecastModel: ''
    }



    constructor() {}




    /* Database Management */




    /**
     * Uploads a Database Backup to the Google Cloud.
     * @param fileName 
     * @returns Promise<void>
     */
    public async uploadDatabaseBackup(fileName: string): Promise<void> {
        await this.bucket.upload(`${this.managementPath.database}/${fileName}`, {
            destination: `${this.destinationPath.database}/${fileName}`,
        });
    }








    public getUploadedBackupFiles(): Promise<GetFilesResponse> {
        return this.bucket.getFiles({
            maxResults: 1000,
            prefix: this.destinationPath.database
        });
    }









    /* Database Management Files */



    /**
     * Retrieves all existing files in the database management volume
     * and deletes them one by one.
     * @returns Promise<void>
     */
    public async cleanDatabaseManagementFiles(): Promise<void> {
        // Retrieve the list of files
        const files: string[] = await this.getDatabaseManagementFiles();

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
        let names: string[] = await this.getDirectoryContentNames(this.managementPath.database);

        // Sort the files in descending order so the first index is always the latest
        names.sort(function (a, b) {
            const aTS: number = Number(a.split('.')[0]);
            const bTS: number = Number(b.split('.')[0]);
            if (aTS > bTS) { return -1 }
            else if (bTS > aTS) { return 1 }
            else { return 0 }
        });

        // Return the final list
        return names;
    }















    /* Volume Files Management */


    




    /**
     * Retrieves a list of all the files within a provided path.
     * @param path 
     * @returns Promise<string[]>
     */
    private getDirectoryContentNames(path: string): Promise<string[]> {
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