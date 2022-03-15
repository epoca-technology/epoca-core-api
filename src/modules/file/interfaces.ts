


// Service
export interface IFileService {
    // Database Management
    uploadDatabaseBackup(fileName: string): Promise<void>,
    restoreDatabaseBackup(fileName: string): Promise<void>,
    cleanDatabaseManagementFiles(): Promise<void>,

    // Forecast Models Management
    
}






export interface IPath {
    database: string,
    forecastModel: string
}


export interface IManagementPath extends IPath { 

}



export interface ICloudPath extends IPath { 

}