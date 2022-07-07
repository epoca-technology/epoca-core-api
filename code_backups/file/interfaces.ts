


// Service
export interface IFileService {
    // Database Backups
    uploadDatabaseBackup(fileName: string): Promise<void>,
    restoreDatabaseBackup(fileName: string): Promise<void>,
    cleanDatabaseManagementFiles(): Promise<void>,

    // Candlestick Spreadsheets
    generateCandlesticksSpreadsheet(fileName: string): Promise<void>,
    generateCandlesticksSpreadsheetPair(): Promise<void>,
}






// Files Configuration
export type IFileExtension = "dump"|"csv";

export interface IFileConfig {
    localPath: string,
    cloudPath: string,
    extension: IFileExtension,
    maxCloudFiles: number
}



