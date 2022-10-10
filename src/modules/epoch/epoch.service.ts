import {inject, injectable} from "inversify";
import { BehaviorSubject } from "rxjs";
import { environment, SYMBOLS } from "../../ioc";
import { IEpochConfig } from "../epoch-builder";
import { IAPIResponse, IUtilitiesService } from "../utilities";
import { 
    IEpochService, 
    IEpochMetricsRecord, 
    IEpochRecord, 
    IEpochValidations, 
    IEpochModel, 
    IEpochFile,
    IUnpackedEpochFile
} from "./interfaces";




@injectable()
export class EpochService implements IEpochService {
    // Inject dependencies
    @inject(SYMBOLS.EpochValidations)           private validations: IEpochValidations;
    @inject(SYMBOLS.EpochFile)                  private file: IEpochFile;
    @inject(SYMBOLS.EpochModel)                 private model: IEpochModel;
    @inject(SYMBOLS.UtilitiesService)           private _utils: IUtilitiesService;


    /**
     * Active Epoch Stream
     * undefined: The module has not been initialized.
     * null: The module has been initialized but there isn't an active epoch.
     * IEpochRecord: There is an active epoch.
     */
    public readonly active: BehaviorSubject<IEpochRecord|null|undefined> = new BehaviorSubject(undefined);


    // Active Epoch's Metrics
    public metrics: IEpochMetricsRecord|undefined = undefined;




    constructor() {}





    /* Retrievers */


    









    /* Initializer */





    /**
     * Initializes the epoch module as well as the current 
     * configuration (if any).
     * @returns Promise<void>
     */
    public async initialize(activeRecord?: IEpochRecord|undefined): Promise<void> {
        // Initialize the active record
        activeRecord = activeRecord ? activeRecord: await this.model.getActiveEpochRecord();

        // Check if there is an active epoch
        if (activeRecord) {
            // Retrieve the metrics
            this.metrics = await this.model.getEpochMetrics(activeRecord.id);

            // Broadcast the active epoch
            this.active.next(activeRecord);
        }
    }







    /**
     * Sets the active epoch as undefined and broadcasts it to 
     * all the modules that rely on an active epoch.
     */
    public stop(): void { 
        this.active.next(null);
        this.metrics = undefined;
    }











    /* Installer */








    public async install(epochID: string): Promise<void> {
        // Firstly, make sure the epoch file can be downloaded
        await this.validations.canEpochFileBeDownloaded(epochID);

        // Download and unpack the file
        const epochFile: IUnpackedEpochFile = await this.file.downloadAndUnpackEpochFile(epochID);

        // If any of the following operations fail, clean the cloud and local directories
        try {
            // Make sure the epoch can be installed
            this.validations.canEpochBeInstalled(epochID, epochFile);

            // Perform the installation
            const record: IEpochRecord = await this.model.install(
                epochFile.epochConfig, 
                epochFile.predictionModelCertificate, 
                epochFile.regressionCertificates
            );



        } catch (e) {
            // Remove the local and cloud epoch file
            // @TODO

            // Rethrow the error
            throw e;
        }
    }





    public async uninstall(): Promise<void> {

    }








    /* Retrievers */


    
}