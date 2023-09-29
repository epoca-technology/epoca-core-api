import {injectable, inject} from "inversify";
import { SYMBOLS } from "../../../../ioc";
import { ICandlestick } from "../../../candlestick";
import { IStateUtilities } from "../_shared";
import { 
    IWindowModel, 
    IWindowService, 
    IWindowState, 
    IWindowStateConfiguration, 
    IWindowValidations
} from "./interfaces";




@injectable()
export class WindowService implements IWindowService {
    // Inject dependencies
    @inject(SYMBOLS.StateUtilities)                     private _stateUtils: IStateUtilities;
    @inject(SYMBOLS.WindowModel)                        private _model: IWindowModel;
    @inject(SYMBOLS.WindowValidations)                  private _validations: IWindowValidations;
    



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
     * Placeholder
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
        const config: IWindowStateConfiguration|undefined = await this._model.getConfigurationRecord();

        // If they have been set, unpack them into the local property
        if (config) {
            this.config = config;
        }

        // Otherwise, set the default policies and save them
        else {
            this.config = this.buildDefaultConfig();
            await this._model.createConfigurationRecord(this.config);
        }
    }






    /**
     * Updates the Window's Configuration on the db and the local property.
     * @param newConfiguration 
     * @returns Promise<void>
     */
    public async updateConfiguration(newConfiguration: IWindowStateConfiguration): Promise<void> {
        // Validate the request
        this._validations.validateConfiguration(newConfiguration);

        // Store the new config on the db and update the local property
        await this._model.updateConfigurationRecord(newConfiguration);
        this.config = newConfiguration;
    }









    /**
     * Builds the default configuration object in order
     * of the db record to be initialized.
     * @returns IWindowStateConfiguration
     */
    private buildDefaultConfig(): IWindowStateConfiguration {
        return {
            requirement: 0.025,
            strongRequirement: 0.85
        }
    }
}