import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../utilities";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { IEpochConfig, IPredictionModelCertificate, IRegressionTrainingCertificate } from "../epoch-builder";
import { IEpochMetricsRecord, IEpochModel, IEpochRecord } from "./interfaces";




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









    /* Epoch Metrics */







    /**
     * Retrieves the Epoch Metrics Record. If the metrics are not found
     * it throws an error.
     * @param epochID 
     * @returns Promise<IEpochMetricsRecord>
     */
    public async getEpochMetrics(epochID: string): Promise<IEpochMetricsRecord> {
        // Retrieve the record if any
        const { rows } = await this._db.query({
            text: `SELECT * FROM  ${this._db.tn.epoch_metrics} WHERE id = $1`,
            values: [ epochID ]
        });

        // Make sure the metrics were found
        if (!rows.length) {
            throw new Error(this._utils.buildApiError(`The metrics for epoch ${epochID} could not be found in the database.`, 18000))
        }

        // Return the result
        return rows[0];
    }







    /**
     * Updates the metrics and creates an epoch position record in an ACID manner.
     * @param epochID 
     * @param newMetrics 
     * @param position 
     * @returns Promise<void>
     */
    public async updateEpochMetrics(epochID: string, newMetrics: IEpochMetricsRecord, position: object): Promise<void> {

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
            await client.query({text: 'BEGIN'});

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

            // Save the metrics' skeleton
            await client.query({
                text: `
                    INSERT INTO ${this._db.tn.epoch_metrics}(id, profit, fees, longs, successful_longs, 
                        shorts, successful_shorts, long_accuracy, short_accuracy, accuracy) 
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `,
                values: [epoch.id, 0, 0, 0, 0, 0, 0, 0, 0, 0]
            });

            // Commit the writes
            await client.query({text: 'COMMIT'});

            // Finally, return the record
            return epoch;
        } catch (e) {
            // Rollback and rethrow the error
            await client.query('ROLLBACK');
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
        await this._db.query({
            text: `UPDATE ${this._db.tn.epochs} SET uninstall=$1 WHERE id=$2`,
            values: [Date.now(), epochID]
        });
    }
    




    

    
}