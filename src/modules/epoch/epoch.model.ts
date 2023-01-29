import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IDatabaseService, IPoolClient } from "../database";
import { IEpochConfig, IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";
import { IEpochModel, IEpochRecord, IEpochListItem } from "./interfaces";




@injectable()
export class EpochModel implements IEpochModel {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                  private _db: IDatabaseService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;



    constructor() {}




    /* Epoch Retrievers */





    /**
     * Retrieves the active epoch record. If no epoch is active,
     * it returns undefined.
     * @returns Promise<IEpochRecord|undefined>
     */
    public async getActiveEpochRecord(): Promise<IEpochRecord|undefined> {
        // Retrieve the record if any
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.epochs} WHERE uninstalled IS NULL`,
            values: []
        });

        // Return the result
        return rows[0];
    }





    /**
     * Retrieves an epoch record by ID. If no epochs match the provided
     * ID it returns undefined.
     * @param epochID 
     * @returns Promise<IEpochRecord|undefined>
     */
    public async getEpochRecordByID(epochID: string): Promise<IEpochRecord|undefined> {
        // Retrieve the record if any
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.epochs} WHERE id = $1`,
            values: [ epochID ]
        });

        // Return the result
        return rows[0];
    }








    /**
     * Retrieves a list of Epoch Items based on the provided start and 
     * limit of records. If no start is provided, it will retrieve the 
     * latest records.
     * @param startAt 
     * @param limit 
     * @returns Promise<IEpochListItem[]>
     */
    public async listEpochs(startAt: number|undefined, limit: number): Promise<IEpochListItem[]> {
        // Init the query
        let text: string = `SELECT id, installed, uninstalled FROM ${this._db.tn.epochs} `;
        let values: number[] = [];

        // Check if the starting point was provided
        if (typeof startAt == "number") {
            text += "WHERE installed < $1 "
            text += "ORDER BY installed DESC LIMIT $2;"
            values.push(startAt);
            values.push(limit);
        }

        // Otherwise, retrieve the latest epochs
        else {
            text += "ORDER BY installed DESC LIMIT $1;"
            values.push(limit);
        }

        // Execute the query
        const { rows } = await this._db.query({ text: text, values: values });

        // Return the result
        return rows;
    }













    /* Epoch Installer */





    /**
     * Stores the epoch's data in the database in an ACID manner. The new Epoch
     * is automatically saved in an active state.
     * Once all the data is saved, it returns the epoch's record.
     * @param epochConfig 
     * @param predictionModelCertificate 
     * @param regressionCertificates 
     * @returns Promise<IEpochRecord>
     */
    public async install(
        epochConfig: IEpochConfig, 
        predictionModelCertificate: IPredictionModelCertificate,
        regressionCertificates: IRegressionTrainingCertificate[]
    ): Promise<IEpochRecord> {
        // Grab a client connection
        const client: IPoolClient = await this._db.pool.connect();

        // Execute the transaction safely
        try { 
            // Begin the transaction
            await client.query({text: "BEGIN"});

            // Init the epoch record
            const epoch: IEpochRecord = {
                id: epochConfig.id,
                installed: Date.now(),
                config: epochConfig,
                model: predictionModelCertificate.model
            }

            // Save the epoch's configuration
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.epochs}(id, installed, config, model) 
                    VALUES ($1, $2, $3, $4)
                `,
                values: [epoch.id, epoch.installed, epoch.config, epoch.model]
            });

            // Save the prediction model certificate
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.prediction_model_certificates}(id, epoch_id, certificate) 
                    VALUES ($1, $2, $3)
                `,
                values: [predictionModelCertificate.id, epoch.id, predictionModelCertificate]
            });

            // Save the regression certificates
            for (let regCert of regressionCertificates) {
                await client.query({
                    text: `
                        INSERT INTO ${this._db.tn.regression_certificates}(id, epoch_id, certificate) 
                        VALUES ($1, $2, $3)
                    `,
                    values: [regCert.id, epoch.id, regCert]
                });
            }

            // Commit the writes
            await client.query({text: "COMMIT"});

            // Finally, return the record
            return epoch;
        } catch (e) {
            // Rollback and rethrow the error
            await client.query("ROLLBACK");
            throw e;
        } finally {
            client.release();
        }
    }








    /**
     * Uninstalls the current active Epoch.
     * @param epochID 
     * @returns Promise<void>
     */
    public async uninstall(epochID: string): Promise<void> {
        // Firstly, set the uninstall date
        await this._db.query({
            text: `UPDATE ${this._db.tn.epochs} SET uninstalled=$1 WHERE id=$2`,
            values: [Date.now(), epochID]
        });

        /* Uninstall Clean Up Actions */

        // Clean the individual prediction records
        await this._db.query({
            text: `DELETE FROM ${this._db.tn.predictions}`,
            values: []
        });
    }
    













    /* Certificate Retrievers */

    




    /**
     * Retrieves a Prediction Model Certificate by ID (Not the Epoch ID). 
     * Throws an error if the certificate is not found.
     * @param id 
     * @returns Promise<IPredictionModelCertificate>
     */
    public async getPredictionModelCertificate(id: string): Promise<IPredictionModelCertificate> {
        // Retrieve the record if any
        const { rows } = await this._db.query({
            text: `SELECT certificate FROM  ${this._db.tn.prediction_model_certificates} WHERE id = $1`,
            values: [ id ]
        });

        // Make sure the certificate was found
        if (!rows.length || !rows[0].certificate) {
            throw new Error(this._utils.buildApiError(`The prediction model certificate ${id} could not be found in the database.`, 18001))
        }

        // Return the result
        return rows[0].certificate;
    }


    

    



    /**
     * Retrieves a Regression Certificate by ID (Not the Epoch ID). 
     * Throws an error if the certificate is not found.
     * @param id 
     * @returns Promise<IPredictionModelCertificate>
     */
     public async getRegressionCertificate(id: string): Promise<IRegressionTrainingCertificate> {
        // Retrieve the record if any
        const { rows } = await this._db.query({
            text: `SELECT certificate FROM  ${this._db.tn.regression_certificates} WHERE id = $1`,
            values: [ id ]
        });

        // Make sure the certificate was found
        if (!rows.length || !rows[0].certificate) {
            throw new Error(this._utils.buildApiError(`The regression certificate ${id} could not be found in the database.`, 18002))
        }

        // Return the result
        return rows[0].certificate;
    }
}