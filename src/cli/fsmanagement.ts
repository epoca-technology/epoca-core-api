// Dependencies 
import "reflect-metadata";
import { appContainer, SYMBOLS } from "../ioc";

// Init the File Service
import { IFileManagerService } from "../modules/file-manager";
const _fm: IFileManagerService = appContainer.get<IFileManagerService>(SYMBOLS.FileManagerService);



async function main() {
    // Retrieve the directory contents
    const files = await _fm.getLocalPathContent("./fs_management");
    console.log(files);

    // Create the candlesticks directory and copy the files into it
    await _fm.makeDirectory("./fs_management/candlesticks");
    await _fm.copyFile("./fs_management/candlesticks.csv", "./fs_management/candlesticks/candlesticks.csv");
    await _fm.copyFile("./fs_management/prediction_candlesticks.csv", "./fs_management/candlesticks/prediction_candlesticks.csv");

    // Zip the candlesticks
    await _fm.zipData("./fs_management/candlesticks", "./fs_management/candlesticks.zip", "candlesticks")

    // Create a directory and unzip them
    await _fm.makeDirectory("./fs_management/candlesticks_unzipped");
    await _fm.unzipData("./fs_management/candlesticks.zip", "./fs_management/candlesticks_unzipped");
    const unzipped = await _fm.getLocalPathContent("./fs_management/candlesticks_unzipped");
    console.log("\n\nUnzipped: \n");
    console.log(unzipped);

    // Upload the zipped file
    const cloudFile = await _fm.uploadFile("./fs_management/candlesticks.zip", "candlesticks_bundle/candlesticks.zip", "zip");
    console.log("\n\nCandlesticks CloudFile: ");
    console.log(cloudFile);


    // Create a directory and download the uploaded file
    const localFile = await _fm.downloadCloudFile("candlesticks_bundle/candlesticks.zip", "./fs_management/downloaded_candlesticks.zip");
    console.log("\n\nCandlesticks Local File: ");
    console.log(localFile);

    // Create a directory and unzip them
    await _fm.makeDirectory("./fs_management/downloaded_candlesticks_unzipped");
    await _fm.unzipData("./fs_management/downloaded_candlesticks.zip", "./fs_management/downloaded_candlesticks_unzipped");
    const downloadedUnzipped = await _fm.getLocalPathContent("./fs_management/downloaded_candlesticks_unzipped");
    console.log("\n\nDownloaded Unzipped: \n");
    console.log(downloadedUnzipped);
}










// Execute the function
main()
.then(() => {
    process.exit(0);
})
.catch((e) => {
    console.error(e);
    process.exit(1);
});