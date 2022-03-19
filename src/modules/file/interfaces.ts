


// Service
export interface IFileService {
    // Database Backups
    uploadDatabaseBackup(fileName: string): Promise<void>,
    restoreDatabaseBackup(fileName: string): Promise<void>,
    cleanDatabaseManagementFiles(): Promise<void>,

    // Forecast Models Management
    // @TODO

    // Candlestick Spreadsheets
    generateCandlesticksSpreadsheet(fileName: string): Promise<void>,
}






// Files Configuration
export type IFileExtension = "dump"|"h5"|"csv";

export interface IFileConfig {
    localPath: string,
    cloudPath: string,
    extension: IFileExtension,
    maxCloudFiles: number
}



