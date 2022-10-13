import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IFileManagerService, ILocalPathItem } from "../file-manager";
import { IEpochConfig, IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";
import { IEpochFile, IUnpackedEpochFile } from "./interfaces";




@injectable()
export class EpochFile implements IEpochFile {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;
    @inject(SYMBOLS.FileManagerService)               private _file: IFileManagerService;

    // Local Management Path
    private readonly localPath: string = "/var/lib/epoch";

    // Cloud Path
    private readonly cloudPath: string = "epoch";

    // Debug Mode
    private readonly debugMode: boolean = environment.debugMode;



    constructor() {}




    


    /**
     * Downloads and unpacks the Epoch File based on the provided ID.
     * @param epochID 
     * @returns Promise<IUnpackedEpochFile>
     */
    public async downloadAndUnpackEpochFile(epochID: string): Promise<IUnpackedEpochFile> {
        // Init the paths
        const fileName: string = `${epochID}.zip`;
        const localPath: string = `${this.localPath}/${fileName}`;
        const cloudPath: string = `${this.cloudPath}/${fileName}`;

        // Prior to downloading the file, make sure the directory is clean
        await this.cleanLocalFiles();

        // Download the epoch file
        const epochFile: ILocalPathItem = await this._file.downloadCloudFile(cloudPath, localPath);

        // Unzip the Epoch File in the Epoch volume
        await this._file.unzipData(localPath, this.localPath);

        // Read the JSON Files
        const jsonFileValues: [IEpochConfig, IPredictionModelCertificate, IRegressionTrainingCertificate[]] = await Promise.all([
            this._file.readJSON(`${this.localPath}/epoch.json`),
            this._file.readJSON(`${this.localPath}/prediction_model_certificate.json`),
            this._file.readJSON(`${this.localPath}/regression_certificates.json`),
        ]);

        // Retrieve the contents of the epoch volume and list the model files
        let modelFileNames: string[] = [];
        const { files, directories } = await this._file.getLocalPathContent(this.localPath);
        files.forEach((file) => { if (file.ext == "h5") modelFileNames.push(`${file.baseName}.h5`) })

        // Finally, return the unpacked epoch file
        return {
            epochConfig: jsonFileValues[0],
            predictionModelCertificate: jsonFileValues[1],
            regressionCertificates: jsonFileValues[2],
            modelFileNames: modelFileNames
        };
    }








    /**
     * Performs a full clean of the contents within the Epoch volume.
     * @returns Promise<void>
     */
    public async cleanLocalFiles(): Promise<void> { return this._file.cleanPath(this.localPath) }







    /**
     * Cleans the Epoch's Cloud files in a persistant way.
     * @returns Promise<void>
     */
    public async cleanCloudFiles(): Promise<void> {
        try { await this._file.cleanCloudFiles(this.cloudPath, "zip", 0) }
        catch (e) {
            console.error("1)Error when attempting to clean the epoch's cloud files. Attempting again in a few seconds.", e);
            await this._utils.asyncDelay(5);
            try { await this._file.cleanCloudFiles(this.cloudPath, "zip", 0) }
            catch (e) {
                console.error("2)Error when attempting to clean the epoch's cloud files. Attempting again in a few seconds.", e);
                await this._utils.asyncDelay(5);
                await this._file.cleanCloudFiles(this.cloudPath, "zip", 0);
            }
        }
    }
}