import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IRegressionTrainingCertificate } from "../epoch-builder";
import { IUtilitiesService, IValidationsService } from "../utilities";
import { IEpochModel, IEpochRecord, IEpochValidations, IUnpackedEpochFile } from "./interfaces";




@injectable()
export class EpochValidations implements IEpochValidations {
    // Inject dependencies
    @inject(SYMBOLS.EpochModel)                       private model: IEpochModel;
    @inject(SYMBOLS.ValidationsService)               private _validations: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;



    constructor() {}





    /* Retrievers */






    /**
     * Verifies if the epochs can be listed based on the provided args.
     * @param startAt 
     * @param limit 
     */
    public canListEpochs(startAt: number|undefined, limit: number): void {
        // Make sure the starting point is valid
        if (typeof startAt == "number" && startAt > Date.now()) {
            throw new Error(this._utils.buildApiError(`The starting point cannot be in the future (${startAt}).`, 17012));
        }

        // Make sure the limit is valid
        if (typeof limit != "number" || limit < 1 || limit > 30) {
            throw new Error(this._utils.buildApiError(`The limit must be an integer ranging 1 and 30 (${limit}).`, 17013));
        }
    }











    /* Installer */




    /**
     * Checks if an Epoch File can be downloaded into the shared volume.
     * @param epochID 
     * @param activeEpoch 
     * @returns Promise<void>
     */
    public async canEpochFileBeDownloaded(epochID: string, activeEpoch: IEpochRecord|null): Promise<void> {
        // Make sure the provided epoch id is valid
        this.validateEpochID(epochID);

        // Make sure there isn't an active epoch
        if (activeEpoch) {
            throw new Error(this._utils.buildApiError(`The Epoch ${epochID} cannot be installed because ${activeEpoch.id} is currently running.`, 17009));
        }

        // Make sure the Epoch ID has not been used
        const duplicateEpoch: IEpochRecord|undefined = await this.model.getEpochRecordByID(epochID);
        if (duplicateEpoch) {
            throw new Error(this._utils.buildApiError(`The Epoch ID ${epochID} has already been used.`, 17010));
        }
    }






    /**
     * Given an Epoch File, it verifies if it can be installed. Otherwise, it 
     * throws an error.
     * @param epochID 
     * @param epochFile
     * @returns void
     */
    public canEpochBeInstalled(epochID: string, epochFile: IUnpackedEpochFile): void {
        // Make sure the provided epoch file has the proper structure
        if (typeof epochFile != "object" || !epochFile) {
            console.log(epochFile);
            throw new Error(this._utils.buildApiError(`The Unpacked Epoch File is not a valid object.`, 17001));
        }
        if (typeof epochFile.epochConfig != "object" || !epochFile.epochConfig) {
            console.log(epochFile.epochConfig);
            throw new Error(this._utils.buildApiError(`The Unpacked Epoch Configuration is not a valid object.`, 17002));
        }
        if (typeof epochFile.predictionModelCertificate != "object" || !epochFile.predictionModelCertificate) {
            console.log(epochFile.predictionModelCertificate);
            throw new Error(this._utils.buildApiError(`The Unpacked Prediction Model Certificate is not a valid object.`, 17003));
        }
        if (!Array.isArray(epochFile.regressionCertificates) || !epochFile.regressionCertificates.length) {
            console.log(epochFile.regressionCertificates);
            throw new Error(this._utils.buildApiError(`The Unpacked Regression Certificates is not a valid list.`, 17004));
        }
        if (!Array.isArray(epochFile.modelFileNames) || !epochFile.modelFileNames.length) {
            console.log(epochFile.modelFileNames);
            throw new Error(this._utils.buildApiError(`The Unpacked Model File Names is not a valid list.`, 17005));
        }

        // Make sure the provided Epoch's ID is identical to the one in the file
        if (epochID != epochFile.epochConfig.id) {
            throw new Error(this._utils.buildApiError(`The provided Epoch ID (${epochID}) is diferent to the one in the Epoch File (${epochFile.epochConfig.id}).`, 17006))
        }

        // Iterate over each regression in the prediction model and make sure the certificate and the model file are present
        for (let reg of epochFile.predictionModelCertificate.model.regressions) {
            // Make sure the regression model file exists
            if (!epochFile.modelFileNames.includes(`${reg.id}.h5`)) {
                console.log(epochFile.modelFileNames);
                throw new Error(this._utils.buildApiError(`The model file for the regression ${reg.id} was not found.`, 17007));
            }

            // Make sure the regression certificate exists
            const cert: Array<IRegressionTrainingCertificate|undefined> = epochFile.regressionCertificates.filter((c) => c.id == reg.id);
            if (!cert.length) throw new Error(this._utils.buildApiError(`The regression certificate for ${reg.id} was not found.`, 17008));
        }
    }
    









    /**
     * Verifies if an epoch can be uninstalled.
     * @param activeEpoch 
     * @returns Promise<void>
     */
    public async canEpochBeUninstalled(activeEpoch: IEpochRecord|null): Promise<void> {
        // Firstly, make sure there is an active epoch
        if (!activeEpoch) {
            throw new Error(this._utils.buildApiError(`The Epoch cannot be uninstalled because none is running.`, 17011));
        }

        // Make sure there are no positions running
        /*const positionSummary: IPositionSummary = this._position.getSummary();
        if (positionSummary.long !== undefined || positionSummary.short !== undefined) {
            console.log(positionSummary);
            throw new Error(this._utils.buildApiError(`The Epoch cannot be uninstalled because there is an active position.`, 17015));
        }*/
    }



    










    /* Shared Validations */






    /**
     * Verifies if the provided Epoch ID is valid. Throws an error otherwise.
     * @param epochID 
     */
    public validateEpochID(epochID: string): void {
        if (!this._validations.epochIDValid(epochID)) {
            throw new Error(this._utils.buildApiError(`The provided Epoch ID (${epochID}) is invalid.`, 17000));
        }
    }







    /**
     * Verifies if the provided Model ID is valid. Throws an error otherwise.
     * @param modelID 
     */
     public validateModelID(modelID: string): void {
        if (!this._validations.modelIDValid(modelID)) {
            throw new Error(this._utils.buildApiError(`The provided Model ID (${modelID}) is invalid.`, 17014));
        }
    }
}