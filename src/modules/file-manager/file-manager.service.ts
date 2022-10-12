import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { getStorage, Storage } from "firebase-admin/storage";
import {Bucket, GetFilesResponse, UploadResponse, DownloadResponse} from "@google-cloud/storage";
import * as fs from "fs";
import * as pathHelper from "path";
import * as Zip from "adm-zip";
import {BigNumber} from "bignumber.js";
import { IUtilitiesService } from "../utilities";
import { IFileExtension, IFileManagerService, IDirectoryContent, ILocalPathItem, ICloudFile } from "./interfaces";





// Class
@injectable()
export class FileManagerService implements IFileManagerService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;

    // Storage Bucket Instance
    public readonly storage: Storage = getStorage();
    public readonly bucket: Bucket = this.storage.bucket();


    constructor() { }




    /* Cloud Files Management */






    /**
     * Uploads a file to the cloud.
     * @param originPath 
     * @param destinationCloudPath 
     * @param extension 
     * @returns Promise<ICloudFile>
     */
     public async uploadFile(originPath: string, destinationCloudPath: string, extension: IFileExtension): Promise<ICloudFile> {
        // Upload the File to Firebase Storage
        const response: UploadResponse = await this.bucket.upload(originPath, {
            destination: destinationCloudPath
        });

        // Make sure there is a response
        if (!response || !Array.isArray(response) || !response.length) {
            console.log(response);
            throw new Error(this._utils.buildApiError(`Google Cloud returned an invalid response when uploading ${originPath}.`, 15000));
        }

        // List the cloud files
        const baseName: string = pathHelper.basename(destinationCloudPath);
        const cloudDirName: string = pathHelper.dirname(destinationCloudPath);
        const cloudFiles: ICloudFile[] = await this.listCloudFiles(cloudDirName, extension);

        // Filter the list and make sure the original file was uploaded successfully
        const selectedFile: ICloudFile[] = cloudFiles.filter((f) => { return f.name == baseName });
        if (selectedFile.length != 1) {
            console.log(selectedFile);
            throw new Error(this._utils.buildApiError(`The upload process went through normally. However, the cloud file could not be listed in: ${destinationCloudPath}.`, 15001));
        }

        // Finally, return the file
        return selectedFile[0];
    }









    /**
     * Downloads a file from the cloud and places it in a local volume.
     * @param originCloudPath 
     * @param destinationPath 
     * @returns Promise<ILocalPathItem>
     */
    public async downloadCloudFile(originCloudPath: string, destinationPath: string): Promise<ILocalPathItem> {
        // Download the file and place it in the management volume
        const downloadResponse: DownloadResponse = await this.bucket.file(originCloudPath).download({
            destination: destinationPath
        });

        // Make sure there is a response
        if (!downloadResponse) {
            console.log(downloadResponse);
            throw new Error(this._utils.buildApiError(`Google Cloud returned an invalid response when downloading ${originCloudPath}.`, 15002));
        }

        // Make sure the file has been placed in the local path
        const dirName: string = pathHelper.dirname(destinationPath);
        const { files, directories } = await this.getLocalPathContent(dirName);

        // Filter the results and make sure there is only 1 item in the selection
        const baseName: string = pathHelper.basename(destinationPath);
        const selectedFile: ILocalPathItem[] = files.filter((f) => { return f.baseName == baseName });
        if (selectedFile.length != 1) {
            console.log(selectedFile);
            throw new Error(this._utils.buildApiError(`The downloaded file was not found in the local directory ${destinationPath}.`, 15003));
        }

        // Finally, return the local item
        return selectedFile[0];
    }






    /**
     * Deletes cloud files that don't fit in the maxFiles window based on their
     * creation time.
     * This functionality is to be used when several copies of the same file are 
     * generated progressively.
     * If no files are meant to be kept, pass 0 in maxFiles.
     * @param cloudPath 
     * @param extension 
     * @param maxFiles 
     * @returns Promise<void>
     */
    public async cleanCloudFiles(cloudPath: string, extension: IFileExtension, maxFiles: number): Promise<void> {
        // Retrieve all the cloud file names
        const cloudFiles: ICloudFile[] = await this.listCloudFiles(cloudPath, extension);

        // Check if some cloud files should be kept
        if (maxFiles > 0) {
            // Build a new list with the files that can be safely deleted and do so
            const deletableFiles: ICloudFile[] = cloudFiles.slice(maxFiles);
            for (let f of deletableFiles) { await this.bucket.file(f.path).delete() }
        }
        
        // Otherwise, delete all the files
        else { for (let f of cloudFiles) { await this.bucket.file(f.path).delete() } }
    }








    /**
     * Retrieves a list of all the cloud files stored in a given path.
     * Notice that if no files are found, it throws an error.
     * @param cloudPath 
     * @param extension 
     * @returns Promise<ICloudFile[]>
     */
    public async listCloudFiles(cloudPath: string, extension: IFileExtension): Promise<ICloudFile[]> {
        // Init the list
        let files: ICloudFile[] = [];

        // Download the cloud files
        const filesResponse: GetFilesResponse = await this.bucket.getFiles({
            maxResults: 1000,
            prefix: cloudPath
        });
        
        // Make sure at least 1 file was found
        if (!filesResponse || !filesResponse[0] || !filesResponse[0].length) {
            throw new Error(this._utils.buildApiError(`The Google Cloud Download did not return valid files for ${cloudPath}.`, 15004));
        }

        // Iterate over the Google Cloud Objects and populate the file names
        for (let f of filesResponse[0]) {
            // Make sure it is a cloud file
            if (
                f &&
                f.metadata && 
                typeof f.metadata.name == "string" && 
                f.metadata.name.includes(extension) && 
                typeof f.metadata.generation == "string"
            ) {
                // Calculate the creation timestamp
                const creationMS: BigNumber = new BigNumber(f.metadata.generation).dividedBy(1000);

                // Append the file to the list
                files.push({
                    name: pathHelper.basename(f.metadata.name),
                    path: f.metadata.name,
                    creation: <number>this._utils.outputNumber(creationMS, {dp: 0})
                });
            }
        }

        // Make sure at least 1 cloud file was extracted
        if (!files.length) {
            throw new Error(this._utils.buildApiError(`Google Cloud returned a valid response. However, no files could be extracted in: ${cloudPath}.`, 15005));
        }

        // Sort the list
        files.sort(this.sortByCreationDescending);

        // Return it
        return files;
    }















    /* Local Files Management */




    /**
     * Verifies if a given path exists.
     * @param path 
     * @returns Promise<boolean>
     */
    public pathExists(path: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            fs.access(path, (error) => {
                // If there is an error, means the path doesnt exist.
                if (error) { resolve(false) } 
                
                // Otherwise, notify that the path exists.
                else { resolve(true) }
            });
        });
    }






    /**
     * Retrieves all the path contents, including files and directories.
     * @param path 
     * @returns Promise<IDirectoryContent>
     */
    public getLocalPathContent(path: string): Promise<IDirectoryContent> {
        return new Promise((resolve, reject) => {
            fs.readdir(path, async (error: any, content: string[]) => {
                // Handle the error
                if (error) reject(error);
    
                // Make sure a list of items has been found
                if (content && content.length) {
                    // Initialize the items
                    let files: ILocalPathItem[] = [];
                    let directories: ILocalPathItem[] = [];

                    // Extract the required information for each item and split them accordingly
                    for (let item of content) {
                        try {
                            // Extract the item info
                            const info: ILocalPathItem = await this.getPathItem(path + '/' + item);

                            // Append the item to the appropiate list
                            if (info.isFile) { files.push(info) } else { directories.push(info) };
                        } catch (e) { reject(e) }
                    }

                    // Sort the files
                    files.sort(this.sortByCreationDescending);

                    // Finally, split the items based on their types
                    resolve({ files: files, directories: directories });
                } else {
                    resolve({files: [], directories: []});
                }
            })
        });
    }





    /**
     * Given a path, it will return the path item associated with it.
     * @param path 
     * @returns Promise<ILocalPathItem>
     */
    private getPathItem(path: string): Promise<ILocalPathItem> {
        return new Promise((resolve, reject) => {
            fs.lstat(path, (error: any, stats: fs.Stats) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the stats found
                const isFile: boolean = stats.isFile();
                resolve({
                    path: path,
                    baseName: pathHelper.basename(path),
                    ext: isFile ? <IFileExtension>pathHelper.extname(path).replace(".", ""): undefined,
                    isFile: isFile,
                    isDirectory: stats.isDirectory(),
                    creation: Math.round(stats.birthtimeMs)
                });
            })
        });
    }








    /**
     * Reads a local file and returns the Buffer.
     * @param filePath 
     * @returns Promise<string>
     */
    public readLocalFile(filePath: string): Promise<string> {
        return new Promise((resolve, reject) => {
            fs.readFile(filePath, (err, data) => {
                // Handle errors
                if (err) reject(err);

                // Resolve the promise
                resolve(data.toString());
            });
        });
    }







    /**
     * Reads a JSON file at a given path. Throws an error if the file does not
     * exist or if it cannot be parsed for any reason.
     * @param filePath 
     * @returns Promise<object|Array<any>|any>
     */
     public async readJSON(filePath: string): Promise<object|Array<any>|any> {
        // Make sure the file exists
        const exists: boolean = await this.pathExists(filePath);
        if (!exists) {
            throw new Error(this._utils.buildApiError(`The JSON File ${filePath} could not be read because it doesn't exist.`, 15006));
        }

        // Read the contents
        const data: string = await this.readLocalFile(filePath);
        if (typeof data != "string" || !data.length) {
            throw new Error(this._utils.buildApiError(`The JSON File ${filePath} is empty.`, 15007));
        }

        // Finally, return parsed the contents
        try {
            return JSON.parse(data.replace(/\bNaN\b/g, "0"));
        } catch (e) {
            throw new Error(this._utils.buildApiError(`Error when parsing ${filePath}: ${this._utils.getErrorMessage(e)}`, 15008));
        }
    }







    /**
     * Writes to a local path based on provided path and name.
     * @param filePath
     * @param data 
     * @returns Promise<void>
     */
     public writeLocalFile(filePath: string, data: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.writeFile(filePath, data, "utf-8", (err) => {
                // Handle errors
                if (err) reject(err);

                // Resolve the promise
                resolve();
            });
        });
    }







    /**
     * Creates a directory in the provided path. If it exists, it will
     * delete it and its contents.
     * @param path 
     * @returns Promise<void>
     */
    public async makeDirectory(path: string): Promise<void> {
        // If the directory exists, delete it first
        const pathExists: boolean = await this.pathExists(path);
        if (pathExists) await this.deleteLocalDirectory(path);

        // Finally, create the directory
        return new Promise((resolve, reject) => {
            fs.mkdir(path, (err) => {
                // Handle errors
                if (err) reject(err);

                // Resolve the promise
                resolve();
            });
        });
    }









    /**
     * Deletes all the files and directories located in provided path.
     * @param path 
     * @returns Promise<void>
     */
     public async cleanPath(path: string): Promise<void> {
        // Retrieve all the files
        const {files, directories} = await this.getLocalPathContent(path);

        // Delete all the directories
        for (let d of directories) { await this.deleteLocalDirectory(d.path) }

        // Delete all the files
        for (let f of files) { await this.deleteLocalFile(f.path) }
    }







    /**
     * Deletes a directory (and its contents) located in the provided path.
     * @param path 
     * @returns Promise<void>
     */
     public deleteLocalDirectory(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.rm(path, {force: true, recursive: true}, (error: any) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the promise
                resolve();
            })
        });
    }





    /**
     * Deletes a file located in the provided path.
     * @param path 
     * @returns Promise<void>
     */
     public deleteLocalFile(path: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.unlink(path, (error: any) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the promise
                resolve();
            })
        });
    }







    /**
     * Copies a file from one path to another.
     * @param originPath 
     * @param destinationPath 
     * @returns Promise<void>
     */
    public copyFile(originPath: string, destinationPath: string): Promise<void> {
        return new Promise((resolve, reject) => {
            fs.copyFile(originPath, destinationPath, (error: any) => {
                // Handle the error
                if (error) reject(error);
    
                // Resolve the promise
                resolve();
            })
        });
    }












    /* Zipping and Unzipping */







    /**
     * Zips a directory as well as its contents and outputs the compressed
     * file in the provided destinationPath.
     * Notice that the directoryName is an optional property that allows to
     * create internal directories within the archive.
     * @param directoryPath 
     * @param destinationPath 
     * @param directoryName?
     * @returns Promise<void>
     */
    public async zipData(directoryPath: string, destinationPath: string, directoryName?: string): Promise<void> {
        // Initialize the Zip Instance
        const zip: Zip = new Zip();

        // Add the directory to the archive
        await zip.addLocalFolderPromise(directoryPath, {
            zipPath: typeof directoryName == "string" ? directoryName: undefined
        });

        // Finally, write the zip file
        await zip.writeZipPromise(destinationPath, { overwrite: true });
    }







    /**
     * Unzips an entire archive into a directory and then returns its content.
     * @param zipPath 
     * @param destinationPath 
     * @returns Promise<void>
     */
    public async unzipData(zipPath: string, destinationPath: string): Promise<void> {
        // Initialize the Zip Instance
        const zip: Zip = new Zip(zipPath);

        // Return the asynchronous extraction
        return new Promise((resolve, reject) => {
            zip.extractAllToAsync(destinationPath, true, false, (error) => {
                // Handle the error
                if (error) reject(error);

                // Resolve the promise
                resolve();
            });
        });
    }





















    /* Misc Helpers */








    /**
     * Function used to order files by creation date in descending order.
     * @param a 
     * @param b 
     * @returns number
     */
     protected sortByCreationDescending(a: object, b: object): number {
        if (a["creation"] > b["creation"] ) { return -1 }
        else if (b["creation"]  > a["creation"] ) { return 1 }
        else { return 0 }
    }
}