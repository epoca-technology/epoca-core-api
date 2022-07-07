import { Storage } from "firebase-admin/storage";
import { Bucket } from "@google-cloud/storage";



// Class
export interface IFileManagerService {
    // Properties
    storage: Storage,
    bucket: Bucket,

    // Cloud Files Management
    uploadFile(originPath: string, destinationCloudPath: string, extension: IFileExtension): Promise<ICloudFile>,
    downloadCloudFile(originCloudPath: string, destinationPath: string): Promise<ILocalPathItem>,
    cleanCloudFiles(cloudPath: string, extension: IFileExtension, maxFiles: number): Promise<void>,
    listCloudFiles(cloudPath: string, extension: IFileExtension): Promise<ICloudFile[]>,

    // Local Files Management
    getLocalPathContent(path: string): Promise<IDirectoryContent>,
    writeLocalFile(filePath: string, data: string): Promise<void>,
    makeDirectory(path: string): Promise<void>,
    cleanPath(path: string): Promise<void>,
    deleteLocalDirectory(path: string): Promise<void>,
    deleteLocalFile(path: string): Promise<void>,
    copyFile(originPath: string, destinationPath: string): Promise<void>,

    // Zipping and Unzipping
    zipData(directoryPath: string, destinationPath: string, directoryName?: string): Promise<void>,
    unzipData(zipPath: string, destinationPath: string): Promise<void>
}




// Extensions
export type IFileExtension = "dump"|"csv"|"zip"|"json"|"h5";



// Cloud File
export interface ICloudFile {
    name: string,
    path: string,
    creation: number
}



// Path Item - Can be a file or a directory
export interface ILocalPathItem {
    path: string,
    baseName: string, // If the item is a file, it will also include the extension
    ext?: IFileExtension // Only present in files
    creation: number,
    isFile: boolean,
    isDirectory: boolean,
}




// Directory Content
export interface IDirectoryContent {
    files: ILocalPathItem[],
    directories: ILocalPathItem[]
}




