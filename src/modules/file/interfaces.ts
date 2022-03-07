
import {GetFilesResponse} from "@google-cloud/storage";




export interface IFileService {
    // Database Management
    uploadDatabaseBackup(fileName: string): Promise<void>,

    cleanDatabaseManagementFiles(): Promise<void>,

    getUploadedBackupFiles(): Promise<GetFilesResponse>
}






export interface IPath {
    database: string,
    forecastModel: string
}


export interface IManagementPath extends IPath { 

}



export interface IDestinationPath extends IPath { 

}