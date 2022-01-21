import {inject, injectable} from "inversify";
import { 
    IServerValidations,
    IServerService,
    IServerBaseBoard, 
    IServerBIOS, 
    IServerCPU, 
    IServerCPUTemperature, 
    IServerFileSystem, 
    IServerGPU, 
    IServerMemory, 
    IServerNetworkConnection, 
    IServerOS, 
    IServerSoftwareVersions, 
    IServerSystem,
    IAlarmsConfig,
} from "./interfaces";
import { defaults } from "./defaults";
import { SYMBOLS } from "../../ioc";
import { IUtilitiesService } from "../shared/utilities";
import { IDatabaseService, IPoolClient } from "../shared/database";
import * as si from "systeminformation";




@injectable()
export class ServerService implements IServerService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ServerValidations)                  private _validations: IServerValidations;
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;

    // Info
    private system: IServerSystem = defaults.system;
    private baseboard: IServerBaseBoard = defaults.baseboard;
    private bios: IServerBIOS = defaults.bios;
    private os: IServerOS = defaults.os;
    private softwareVersions: IServerSoftwareVersions = defaults.softwareVersions;
    private networkConnections: IServerNetworkConnection[] = defaults.networkConnections;

    // Resources
    private lastResourceScan: number = defaults.lastResourceScan;
    private fileSystems: IServerFileSystem[] = defaults.fileSystems;
    private memory: IServerMemory = defaults.memory;
    private cpu: IServerCPU = defaults.cpu;
    private cpuTemperature: IServerCPUTemperature = defaults.cpuTemperature;
    private gpu: IServerGPU = defaults.gpu;
    
    // Alarms
    public alarmsTable: string = 'server_alarms';
    private alarms: IAlarmsConfig = defaults.alarms;

    // Test Mode
    public testMode: boolean = false;



    constructor() {}


    



    public async initialize(): Promise<void> {

    }












    /* Alarms Management */












    public async setAlarmsConfiguration(config: IAlarmsConfig): Promise<void> {
        // Validate Request
        this._validations.canSetAlarmsConfiguration(config);

        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {


            // Update the local values
            this.alarms = config;
        } finally { client.release() }
    }

    











    /* Misc Helpers */







    /**
     * Retrieves the alarms table to use based on the test mode.
     * @returns string
     */
    private getAlarmsTable(): string { return this.testMode ? this._db.getTestTableName(this.alarmsTable): this.alarmsTable};
}