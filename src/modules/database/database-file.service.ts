import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IApiErrorService } from "../api-error";
import { ICloudFile, IFileExtension, IFileManagerService, ILocalPathItem } from "../file-manager";
import { IDatabaseFileService, IDatabaseService } from "./interfaces";


@injectable()
export class DatabaseFileService implements IDatabaseFileService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ApiErrorService)                    private _apiError: IApiErrorService;
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.FileManagerService)                 private _file: IFileManagerService;

    // Local Management Path
    private readonly localPath: string = "/var/lib/pgdata-management";

    // Cloud Path
    private readonly cloudPath: string = "db_backups";

    // Max Cloud Files
    private readonly maxFiles: number = 5;

    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;




    
    constructor() {}





    /* Backup */





    /**
     * Uploads a Database Backup that has already been generated and stored
     * in the local volume to the Google Cloud.
     * @param fileName 
     * @returns Promise<void>
     */
    public async uploadDatabaseBackup(fileName: string): Promise<void> {
        // Init values
        const ext: IFileExtension = "dump";
        const localPath: string = `${this.localPath}/${fileName}`;
        const cloudPath: string = `${this.cloudPath}/${fileName}`;

        // Upload the file
        const uploadedFile: ICloudFile = await this._file.uploadFile(localPath, cloudPath, ext);

        // Now that the file has been uploaded, clean the cloud path
        await this._file.cleanCloudFiles(this.cloudPath, ext, this.maxFiles);

        // Finally, clean the local volume
        await this._file.cleanPath(this.localPath);
    }









    /* Restore */




    /**
     * Downloads a Database Backup file and places into the management
     * directory. Once the download completes, it removes the entire db
     * and then initializes it in a blank state so pg_restore can be invoked.
     * @param fileName
     * @returns Promise<void>
     */
     public async restoreDatabaseBackup(fileName: string): Promise<void> {
        // Init values
        const localPath: string = `${this.localPath}/${fileName}`;
        const cloudPath: string = `${this.cloudPath}/${fileName}`;

        // Download the file and place it in the local volume
        const downloadedFile: ILocalPathItem = await this._file.downloadCloudFile(cloudPath, localPath);

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
    public cleanDatabaseManagementFiles(): Promise<void> {
        return this._file.cleanPath(this.localPath);
    }














    /* Misc Helpers */

    



}