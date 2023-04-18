import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../ioc";
import { ICandlestick } from "../candlestick";
import { IDatabaseService } from "../database";
import { IUtilitiesService, IValidationsService } from "../utilities";
import {
    IStateUtilitiesService,
    IWindowState,
    IWindowStateConfiguration,
    IWindowStateService,
} from "./interfaces";




@injectable()
export class WindowStateService implements IWindowStateService {
    // Inject dependencies
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.StateUtilitiesService)              private _stateUtils: IStateUtilitiesService;
    @inject(SYMBOLS.ValidationsService)                 private _val: IValidationsService;
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;



    /**
     * Configuration
     * The configuration that will be used in order to calculate the 
     * state of the window.
     */
    public config: IWindowStateConfiguration;



    constructor() { }










    /******************
     * Initialization *
     ******************/



    /**
     * Initializes the configuration for the window module. If it hasn't 
     * already been set, it will initialize the default values.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        // Initialize the configuration
        await this.initializeConfiguration();

        // ...
    }





    /**
     * ...
     */
    public stop(): void {

    }

















    /*********************
     * State Calculation *
     *********************/






    /**
     * Calculates the state for the current window.
     * @param window 
     * @returns IWindowState
     */
    public calculateState(window: ICandlestick[]): IWindowState {
        const { averageState, splitStates } = this._stateUtils.calculateCurrentState(
            window, 
            this.config.requirement, 
            this.config.strongRequirement
        );
        return {
            s: averageState,
            ss: splitStates,
            w: window
        };
    }






    





    /**
     * Retrieves the module's default state.
     * @returns IWindowState
     */
    public getDefaultState(): IWindowState {
        return {
            s: 0,
            ss: {
                s100: {s: 0, c: 0},
                s75: {s: 0, c: 0},
                s50: {s: 0, c: 0},
                s25: {s: 0, c: 0},
                s15: {s: 0, c: 0},
                s10: {s: 0, c: 0},
                s5: {s: 0, c: 0},
                s2: {s: 0, c: 0},
            },
            w: []
        }
    }





















    /****************************
     * Configuration Management *
     ****************************/






    /**
     * Initializes the Window's Configuration straight from the db.
     * If the record does not exist, it is initialized.
     * @returns Promise<void>
     */
    private async initializeConfiguration(): Promise<void> {
        // Retrieve the config stored in the db
        const config: IWindowStateConfiguration|undefined = await this.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: IWindowStateConfiguration): Promise<void> {
        // Validate the request
        if (!newConfiguration || typeof newConfiguration != "object") {
            console.log(newConfiguration);
            throw new Error(this._utils.buildApiError(`The provided window config object is invalid.`, 25000));
        }
        if (!this._val.numberValid(newConfiguration.requirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided requirement (${newConfiguration.requirement}) is invalid.`, 25001));
        }
        if (!this._val.numberValid(newConfiguration.strongRequirement, 0.01, 100)) {
            throw new Error(this._utils.buildApiError(`The provided strongRequirement (${newConfiguration.strongRequirement}) is invalid.`, 25002));
        }
        if (newConfiguration.requirement >= newConfiguration.strongRequirement) {
            throw new Error(this._utils.buildApiError(`The requirement cannot be greater than or equals to the 
            strongRequirement. Received: ${newConfiguration.requirement} | ${newConfiguration.strongRequirement}.`, 25003));
        }

        // Store the new config on the db and update the local property
        await this.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }











    /* Configuration Record Management */






    /**
     * Retrieves the Window's Configuration from the db. If there is
     * no record, it returns undefined.
     * @returns Promise<IWindowStateConfiguration|undefined>
     */
    private async getConfigurationRecord(): Promise<IWindowStateConfiguration|undefined> {
        // Retrieve the data
        const { rows } = await this._db.query({
            text: `SELECT data FROM  ${this._db.tn.window_state_configuration} WHERE id = 1`,
            values: []
        });

        // Return the result
        return rows.length ? rows[0].data: undefined;
    }





    /**
     * Creates the Window' Configuration on the db.
     * @param defaultConfiguration 
     * @returns Promise<void>
     */
    private async createConfigurationRecord(defaultConfiguration: IWindowStateConfiguration): Promise<void> {
        await this._db.query({
            text: `INSERT INTO ${this._db.tn.window_state_configuration}(id, data) VALUES(1, $1)`,
            values: [defaultConfiguration]
        });
    }





    /**
     * Updates the Window's Configuration on the db.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    private async updateConfigurationRecord(newConfiguration: IWindowStateConfiguration): Promise<void> {
        await this._db.query({
            text: `UPDATE ${this._db.tn.window_state_configuration} SET data=$1 WHERE id=1`,
            values: [newConfiguration]
        });
    }







    /* Misc Helpers */



    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns IWindowStateConfiguration
     */
    private buildDefaultConfig(): IWindowStateConfiguration {
        return {
            requirement: 0.025,
            strongRequirement: 1
        }
    }
}