import {inject, injectable} from "inversify";
import { SYMBOLS } from "../../ioc";
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
    IServerNetworkInterface, 
    IServerOS, 
    IServerSoftwareVersions, 
    IServerSystem,
    IAlarmsConfig,
    IServerRunningService
} from "./interfaces";
import { defaults } from "./defaults";
import { queries } from "./queries";
import { IUtilitiesService } from "../shared/utilities";
import { IDatabaseService, IPoolClient, IQueryResult } from "../shared/database";
import { INotificationService } from "../shared/notification";
import * as si from "systeminformation";
import {BigNumber} from "bignumber.js";




@injectable()
export class ServerService implements IServerService {
    // Inject dependencies
    @inject(SYMBOLS.UtilitiesService)                   private _utils: IUtilitiesService;
    @inject(SYMBOLS.ServerValidations)                  private _validations: IServerValidations;
    @inject(SYMBOLS.DatabaseService)                    private _db: IDatabaseService;
    @inject(SYMBOLS.NotificationService)                private _notification: INotificationService;

    // Info
    private system: IServerSystem = defaults.system;
    private baseboard: IServerBaseBoard = defaults.baseboard;
    private bios: IServerBIOS = defaults.bios;
    private os: IServerOS = defaults.os;
    private softwareVersions: IServerSoftwareVersions = defaults.softwareVersions;
    private networkInterfaces: IServerNetworkInterface[] = defaults.networkInterfaces;

    // Resources
    private uptime: number = defaults.uptime;
    private lastResourceScan: number = defaults.lastResourceScan;
    private fileSystems: IServerFileSystem[] = defaults.fileSystems;
    private memory: IServerMemory = defaults.memory;
    private cpu: IServerCPU = defaults.cpu;
    private cpuTemperature: IServerCPUTemperature = defaults.cpuTemperature;
    private gpu: IServerGPU = defaults.gpu;
    private runningServices: IServerRunningService[] = defaults.runningServices;
    
    // Alarms
    public alarmsTable: string = 'server_alarms';
    private alarms: IAlarmsConfig = defaults.alarms;

    // Test Mode
    public testMode: boolean = false;



    constructor() {}







    



    public async initialize(): Promise<void> {

    }





    public async initializeData(): Promise<void> {
        // Initialize Alarms
        await this.setAlarmsConfiguration();

        // Retrieve the servers info and populate it
        const data: any = await si.get({
            system: queries.system,
            baseboard: queries.baseboard,
            bios: queries.bios,
            osInfo: queries.osInfo,
            versions: queries.versions,
            networkInterfaces: queries.networkInterfaces,
            fsSize: queries.fsSize,
            mem: queries.mem,
            cpu: queries.cpu,
            cpuTemperature: queries.cpuTemperature,
            graphics: queries.graphics,
            currentLoad: queries.currentLoad,
            //services: queries.services, Doesnt work
        });
        console.log(data);
        console.log(await si.services(queries.services));
    }









    /* Setters */






    // System
    private setSystem(system: IServerSystem): void {
        if (system) {
            if (system.manufacturer) this.system.manufacturer = system.manufacturer;
            if (system.model) this.system.model = system.model;
            if (system.version) this.system.version = system.version;
            if (system.sku) this.system.sku = system.sku;
        }
    }


    // BaseBoard
    private setBaseBoard(baseboard: IServerBaseBoard): void {
        if (baseboard) {
            if (baseboard.manufacturer) this.baseboard.manufacturer = baseboard.manufacturer;
            if (baseboard.model) this.baseboard.model = baseboard.model;
            if (baseboard.version) this.baseboard.version = baseboard.version;
        }
    }


    // BIOS
    private setBIOS(bios: IServerBIOS): void {
        if (bios) {
            if (bios.vendor) this.bios.vendor = bios.vendor;
            if (bios.version) this.bios.version = bios.version;
            if (bios.releaseDate) this.bios.releaseDate = bios.releaseDate;
            if (bios.revision) this.bios.revision = bios.revision;
        }
    }



    // OS
    private setOS(os: IServerOS): void {
        if (os) {
            if (os.platform) this.os.platform = os.platform;
            if (os.distro) this.os.distro = os.distro;
            if (os.release) this.os.release = os.release;
            if (os.codename) this.os.codename = os.codename;
            if (os.kernel) this.os.kernel = os.kernel;
            if (os.arch) this.os.arch = os.arch;
            if (os.hostname) this.os.hostname = os.hostname;
            if (os.fqdn) this.os.fqdn = os.fqdn;
        }
    }


    // Software Versions
    private setSoftwareVersions(versions: IServerSoftwareVersions): void {
        if (versions) { this.softwareVersions = versions }
    }



    // Network Interfaces
    private setNetworkInterfaces(networks: IServerNetworkInterface[]): void {
        if (networks && networks.length) { this.networkInterfaces = networks }
    }




    // File Systems
    private setFileSystems(fsList: IServerFileSystem[]): void {
        if (fsList && fsList.length) {
            this.fileSystems = [];
            fsList.forEach((fs) => {
                this.fileSystems.push({
                    fs: fs.fs || "Unknown",
                    type: fs.type || "Unknown",
                    size: this.fromBytesToGigabytes(fs.size),
                    used: this.fromBytesToGigabytes(fs.used),
                    available: this.fromBytesToGigabytes(fs.available),
                    mount: fs.mount || "Unknown",
                    usedPercent: fs.type && fs.used ? <number>this._utils.calculatePercentageOutOfTotal(fs.used, fs.size): 0
                });
            });
        }
    }



    // Memory
    private setMemory(memory: IServerMemory): void {
        if (memory) {
            if (memory.total) this.memory.total = this.fromBytesToGigabytes(memory.total);
            if (memory.free) this.memory.free = this.fromBytesToGigabytes(memory.free);
            if (memory.used) this.memory.used = this.fromBytesToGigabytes(memory.used);
            if (memory.used && memory.total) this.memory.usedPercent = <number>this._utils.calculatePercentageOutOfTotal(memory.used, memory.total);
        }
    }





    // CPU
    private setCPU(cpu: IServerCPU): void {
        if (cpu) {
            if (cpu.manufacturer) this.cpu.manufacturer = cpu.manufacturer;
            if (cpu.brand) this.cpu.brand = cpu.brand;
            if (cpu.vendor) this.cpu.vendor = cpu.vendor;
            if (cpu.family) this.cpu.family = cpu.family;
            if (cpu.model) this.cpu.model = cpu.model;
            if (cpu.speed) this.cpu.speed = cpu.speed;
            if (cpu.cores) this.cpu.cores = cpu.cores;
            if (cpu.physicalCores) this.cpu.physicalCores = cpu.physicalCores;
        }
    }




    // CPU Temperature
    private setCPUTemperature(temp: IServerCPUTemperature): void {
        if (temp) {
            if (temp.main) this.cpuTemperature.main = temp.main;
            if (temp.cores) this.cpuTemperature.cores = temp.cores;
            if (temp.max) this.cpuTemperature.max = temp.max;
            if (temp.socket) this.cpuTemperature.socket = temp.socket;
            if (temp.chipset) this.cpuTemperature.chipset = temp.chipset;
        }
    }



    // GPU
    private setGPU(gpu: IServerGPU): void {
        if (gpu) {
            if (gpu.vendor) this.gpu.vendor = gpu.vendor;
            if (gpu.model) this.gpu.model = gpu.model;
            if (gpu.bus) this.gpu.bus = gpu.bus;
            if (gpu.utilizationGpu) this.gpu.utilizationGpu = gpu.utilizationGpu;
            if (gpu.temperatureGpu) this.gpu.temperatureGpu = gpu.temperatureGpu;
            if (gpu.temperatureMemory) this.gpu.temperatureMemory = gpu.temperatureMemory;
        }
    }





    // Running Services
    private setRunningServices(services: IServerRunningService[]): void {
        if (services && services.length) {
            this.runningServices = [];
            services.forEach((s) => {
                if (s.running) this.runningServices.push(s)
            });
        }
    }
















    /* Alarms Management */







    
    /**
     * Saves a provided configuration in the db and also sets them locally.
     * If no config is provided, it will download and set the current ones.
     * If the config has not been initialized, it will save and set the 
     * default parameters.
     * @param c 
     * @returns Promise<void>
     */
    public async setAlarmsConfiguration(c?: IAlarmsConfig): Promise<void> {
        // Validate Request if a new config has been provided
        if (c) this._validations.canSetAlarmsConfiguration(c);

        // Initialize the client
        const client: IPoolClient = await this._db.pool.connect();
        try {
            // If the config was provided, update it
            if (c) {
                await client.query({
                    text: `
                        UPDATE ${this.getAlarmsTable()} 
                        SET max_file_system_usage=$1, max_memory_usage=$2, max_cpu_load=$3, max_cpu_temperature=$4, max_gpu_load=$5, max_gpu_temperature=$6, max_gpu_memory_temperature=$7
                        WHERE id=1
                    `,
                    values: [
                        c.max_file_system_usage,
                        c.max_memory_usage,
                        c.max_cpu_load,
                        c.max_cpu_temperature,
                        c.max_gpu_load,
                        c.max_gpu_temperature,
                        c.max_gpu_memory_temperature,
                    ]
                });

                // Update the local values
                this.alarms = c;
            }

            // Otherwise, retrieve the current values
            else {
                // Retrieve the current configuration
                const {rows}: IQueryResult = await client.query({
                    text: `
                        SELECT max_file_system_usage, max_memory_usage, max_cpu_load, max_cpu_temperature, max_gpu_load, max_gpu_temperature, max_gpu_memory_temperature
                        FROM ${this.getAlarmsTable()}
                        WHERE id=1
                    `,
                    values: []
                });

                // If it exists, update the local values
                if (rows.length) { this.alarms = rows[0] }

                // Otherwise, save the defaults
                else {
                    await client.query({
                        text: `
                            INSERT INTO ${this.getAlarmsTable()}(id, max_file_system_usage, max_memory_usage, max_cpu_load, max_cpu_temperature, max_gpu_load, max_gpu_temperature, max_gpu_memory_temperature) 
                            VALUES (1, $1, $2, $3, $4, $5, $6, $7)
                        `,
                        values: [
                            defaults.alarms.max_file_system_usage,
                            defaults.alarms.max_memory_usage,
                            defaults.alarms.max_cpu_load,
                            defaults.alarms.max_cpu_temperature,
                            defaults.alarms.max_gpu_load,
                            defaults.alarms.max_gpu_temperature,
                            defaults.alarms.max_gpu_memory_temperature,
                        ]
                    });
    
                    // Update the local values
                    this.alarms = defaults.alarms;
                }
            }
        } finally { client.release() }
    }

    





    /**
     * Retrieves the alarms table to use based on the test mode.
     * @returns string
     */
    public getAlarmsTable(): string { return this.testMode ? this._db.getTestTableName(this.alarmsTable): this.alarmsTable};


















    /* Misc Helpers */








    /**
     * Converts bytes into gigabytes. If the provided value is not a number
     * it will return 0.
     * @param bytes 
     * @returns number
     */
    private fromBytesToGigabytes(bytes: number): number {
        if (typeof bytes != "number" || bytes == 0) return 0;
        return <number>this._utils.outputNumber(new BigNumber(bytes).dividedBy(1000*1000*1000)); 
    }
}