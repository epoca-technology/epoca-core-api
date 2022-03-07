// Dependencies 
import "reflect-metadata";
import { appContainer, environment, SYMBOLS } from "../ioc";

// Init the File Service
import { IFileService } from "../modules/file";
const _file: IFileService = appContainer.get<IFileService>(SYMBOLS.FileService);



async function main(argv: string[]) {
    // Init the name
    const action: string = argv.slice(2)[0];
    const backupName: string|undefined = argv.slice(3)[0];

    // Handle the action accordingly
    switch(action) {
        // Database Backup
        case 'backup':
            // Make sure the backup name was provided
            if (!backupName) {
                throw new Error('The backup name is required in order to upload a Database Backup.');
            }
            
            // Upload the backup to Firebase Storage
            await _file.uploadDatabaseBackup(backupName);
            break;
        // Database Restore
        case 'restore':
            // Make sure the backup name has been provided
            if (!backupName) {
                throw new Error('The backup name is required in order to download a Database Backup.');
            }

            // Make sure the API was started on restore mode
            if (!environment.restoreMode) {
                throw new Error('The backup name is required in order to download a Database Backup.');
            }

            // Restore Database
            // @TODO
            break;
        // Management Files Cleanup
        case 'clean':
            await _file.cleanDatabaseManagementFiles();
            break;
        default:
            const files = await _file.getUploadedBackupFiles();
            console.log(files);
            //throw new Error('The provided action is invalid.');
    }
}










// Execute the function
main(process.argv)
.then(() => {
    process.exit(0);
})
.catch((e) => {
    console.error(e);
    process.exit(1);
});