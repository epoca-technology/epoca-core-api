import {inject, injectable} from "inversify";
import { SYMBOLS, environment } from "../../ioc";
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
    IServerRunningService,
    IServerCPULoad,
    IServerInfo,
    IServerResources,
    IServerData
} from "./interfaces";
import { defaults } from "./defaults";
import { queries } from "./queries";
import { IUtilitiesService } from "../utilities";
import { IDatabaseService, IPoolClient, IQueryResult } from "../database";
import { INotificationService } from "../notification";
import * as si from "systeminformation";



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
    private cpu: IServerCPU = defaults.cpu;

    // Resources
    private uptime: number = defaults.uptime;
    private lastResourceScan: number = defaults.lastResourceScan;
    private fileSystems: IServerFileSystem[] = defaults.fileSystems;
    private memory: IServerMemory = defaults.memory;
    private cpuTemperature: IServerCPUTemperature = defaults.cpuTemperature;
    private gpu: IServerGPU = defaults.gpu;
    private runningServices: IServerRunningService[] = defaults.runningServices;
    private cpuLoad: IServerCPULoad = defaults.cpuLoad;
    
    // Alarms
    private alarmsTable: string = 'server_alarms';
    private alarms: IAlarmsConfig = defaults.alarms;

    // Interval
    private monitorIntervalSeconds: number = 180; // ~3 minutes
    private monitorInterval: any;

    // Test Mode
    public testMode: boolean = false;



    constructor() {}




    /* Retrievers */




    /**
     * Retrieves a collection of the server info and the resources.
     * @returns 
     */
    public getServerData(): IServerData {
        return {
            production: environment.production,
            info: this.getServerInfo(),
            resources: this.getServerResources(),
        }
    }









    /**
     * Retrieves the server info object. This data does not change as time
     * moves on.
     * @returns IServerInfo
     */
    public getServerInfo(): IServerInfo {
        return {
            system: this.system,
            baseboard: this.baseboard,
            bios: this.bios,
            os: this.os,
            softwareVersions: this.softwareVersions,
            networkInterfaces: this.networkInterfaces,
            cpu: this.cpu,
        }
    }







    /**
     * Retrieves the server resources object. This data changes every time the interval
     * is invoked.
     * @returns IServerResources
     */
    public getServerResources(): IServerResources {
        return {
            uptime: this.uptime,
            lastResourceScan: this.lastResourceScan,
            alarms: this.alarms,
            fileSystems: this.fileSystems,
            memory: this.memory,
            cpuTemperature: this.cpuTemperature,
            gpu: this.gpu,
            runningServices: this.runningServices,
            cpuLoad: this.cpuLoad
        }
    }














    /* Initializers */


    





    /**
     * Initializes the server module and the interval that will permanently monitor
     * the resources to prevent server damage.
     * @returns Promise<void>
     */
    public async initialize(): Promise<void> {
        try {
            // Perform a full initialization
            await this.initializeData();

            // Create the interval 
            this.monitorInterval = setInterval(async () => {
                try { await this.updateDynamicData() } 
                catch (e) {
                    console.error('The server module encountered an error when updating dynamic data', e);
                }
            }, this.monitorIntervalSeconds * 1000);
        } catch (e) {
            console.error('The server module could not be initialized: ', e);
        }
    }





    /**
     * Clears the monitor interval if exists.
     * @returns void
     */
    public stop(): void { if (this.monitorInterval) clearInterval(this.monitorInterval)}







    /**
     * Initializes the alarms and all of the system's data. It also triggers
     * the monitoring system for the first time.
     * @returns Promise<void>
     */
    private async initializeData(): Promise<void> {
        // Initialize Alarms
        await this.setAlarmsConfiguration();

        // Retrieve the servers info and populate it
        const data: any = await si.get({
            system: queries.system,
            time: queries.time,
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
            currentLoad: queries.currentLoad
        });

        // Retrieve the running services
        const services: IServerRunningService[] = await si.services(queries.services);

        // Set Static values
        this.setStaticValues({
            system: data.system,
            baseboard: data.baseboard,
            bios: data.bios,
            os: data.osInfo,
            softwareVersions: data.versions,
            networkInterfaces: data.networkInterfaces,
            cpu: data.cpu,
        });

        // Set Dynamic values
        this.setDynamicValues({
            uptime: this._utils.fromSecondsToHours(data.time.uptime),
            fileSystems: data.fsSize,
            memory: data.mem,
            cpuTemperature: data.cpuTemperature,
            gpu: data.graphics && data.graphics.controllers ? data.graphics?.controllers[0]: undefined,
            runningServices: services,
            cpuLoad: data.currentLoad
        });
    }







    /**
     * Updates the dynamic data as well as monitoring the resources based
     * on the latest values.
     * @returns Promise<void>
     */
    private async updateDynamicData(): Promise<void> {
        // Retrieve the servers info and populate it
        const data: any = await si.get({
            time: queries.time,
            fsSize: queries.fsSize,
            mem: queries.mem,
            cpu: queries.cpu,
            cpuTemperature: queries.cpuTemperature,
            graphics: queries.graphics,
            currentLoad: queries.currentLoad
        });

        // Retrieve the running services
        const services: IServerRunningService[] = await si.services(queries.services);

        // Set Dynamic values
        this.setDynamicValues({
            uptime: this._utils.fromSecondsToHours(data.time.uptime),
            fileSystems: data.fsSize,
            memory: data.mem,
            cpuTemperature: data.cpuTemperature,
            gpu: data.graphics && data.graphics.controllers ? data.graphics?.controllers[0]: undefined,
            runningServices: services,
            cpuLoad: data.currentLoad
        });
    }

















    /* Setters */






    /**
     * Sets the retrieved static values. This data is only set once.
     * @param data 
     * @returns void
     */
    private setStaticValues(data: {
        system: IServerSystem,
        baseboard: IServerBaseBoard,
        bios: IServerBIOS,
        os: IServerOS,
        softwareVersions: IServerSoftwareVersions,
        networkInterfaces: IServerNetworkInterface[],
        cpu: IServerCPU,
    }): void {
        this.setSystem(data.system);
        this.setBaseBoard(data.baseboard);
        this.setBIOS(data.bios);
        this.setOS(data.os);
        this.setSoftwareVersions(data.softwareVersions);
        this.setNetworkInterfaces(data.networkInterfaces);
        this.setCPU(data.cpu);
    }









    /**
     * Sets the retrieved static values and then performs a resource monitoring.
     * This is a recurrent action
     * @param data 
     * @returns void
     */
    private setDynamicValues(data: {
        uptime: number,
        fileSystems: IServerFileSystem[],
        memory: IServerMemory,
        cpuTemperature: IServerCPUTemperature,
        gpu: IServerGPU,
        runningServices: IServerRunningService[],
        cpuLoad: IServerCPULoad
    }): void {
        // Set values
        this.uptime = data.uptime;
        this.lastResourceScan = Date.now();
        this.setFileSystems(data.fileSystems);
        this.setMemory(data.memory);
        this.setCPUTemperature(data.cpuTemperature);
        this.setGPU(data.gpu);
        this.setRunningServices(data.runningServices);
        this.setCPULoad(data.cpuLoad);
        
        // Now that all values have been set, monitor the resources
        this.monitorResources();
    }










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
        if (versions) { 
            this.softwareVersions = {};
            for (let k in versions) {
                if (versions[k] && versions[k].length) {
                    this.softwareVersions[k] = versions[k]
                }
            }
        }
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
                    size: this._utils.fromBytesToGigabytes(fs.size),
                    used: this._utils.fromBytesToGigabytes(fs.used),
                    available: this._utils.fromBytesToGigabytes(fs.available),
                    mount: fs.mount || "Unknown",
                    usedPercent: fs.type && fs.used ? <number>this._utils.calculatePercentageOutOfTotal(fs.used, fs.size): 0
                });
            });
        }
    }



    // Memory
    private setMemory(memory: IServerMemory): void {
        if (memory) {
            if (memory.total) this.memory.total = this._utils.fromBytesToGigabytes(memory.total);
            if (memory.free) this.memory.free = this._utils.fromBytesToGigabytes(memory.free);
            if (memory.used) this.memory.used = this._utils.fromBytesToGigabytes(memory.used);
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
            services.forEach((s) => { if (s.running) this.runningServices.push(s) });
        }
    }



    // CPU Load
    private setCPULoad(load: IServerCPULoad): void {
        if (load) {
            if (load.avgLoad) this.cpuLoad.avgLoad = load.avgLoad;
            if (load.currentLoad) this.cpuLoad.currentLoad = load.currentLoad;
        }
    }















    /* Monitoring */





    /**
     * It will check resource by resource and make sure the states are
     * in manageable conditions. If a resource is above the allowed value
     * it will notify users unless test mode is enabled.
     * @returns void
     */
    private async monitorResources(): Promise<void> {
        if (!this.testMode) {
            // Monitor the File Systems Usage
            if (!this.isFileSystemUsageAcceptable()) {

            }

            // Monitor the Memory Usage
            if (!this.isMemoryUsageAcceptable()) {

            }

            // Monitor the CPU Load
            if (!this.isCPULoadAcceptable()) {

            }

            // Monitor the CPU Temperature
            if (!this.isCPUTemperatureAcceptable()) {

            }

            // Monitor the GPU Load
            if (!this.isGPULoadAcceptable()) {

            }

            // Monitor the GPU Temperature
            if (!this.isGPUTemperatureAcceptable()) {

            }

            // Monitor the GPU Memory Temperature
            if (!this.isGPUMemoryTemperatureAcceptable()) {

            }
        }
    }







    /**
     * Checks if the file systems' usage is within the acceptable range.
     * @returns boolean
     */
    private isFileSystemUsageAcceptable(): boolean {
        for (let fs of this.fileSystems) { if (fs.usedPercent >= this.alarms.max_file_system_usage) return false }
        return true;
    }





    /**
     * Checks if the memory's usage is within the acceptable range.
     * @returns boolean
     */
    private isMemoryUsageAcceptable(): boolean {
        return this.memory.usedPercent < this.alarms.max_memory_usage;
    }







    /**
     * Checks if the CPU's load is within the acceptable range.
     * @returns boolean
     */
    private isCPULoadAcceptable(): boolean {
        return this.cpuLoad.avgLoad < this.alarms.max_cpu_load && this.cpuLoad.currentLoad < this.alarms.max_cpu_load;
    }






    /**
     * Checks if the temperature in all CPU components are within the acceptable
     * range.
     * @returns boolean
     */
     private isCPUTemperatureAcceptable(): boolean {
        // Check the main property
        if (this.cpuTemperature.main >= this.alarms.max_cpu_temperature) return false;

        // Check the chipset
        if (this.cpuTemperature.chipset >= this.alarms.max_cpu_temperature) return false;

        // Check each core
        for (let c of this.cpuTemperature.cores) { if (c >= this.alarms.max_cpu_temperature) return false }

        // Check each socket
        for (let s of this.cpuTemperature.socket) { if (s >= this.alarms.max_cpu_temperature) return false }

        // Otherwise, the temperature is acceptable
        return true;
    }






    /**
     * Checks if the GPU's load is within the acceptable range.
     * @returns boolean
     */
    private isGPULoadAcceptable(): boolean { return this.gpu.utilizationGpu < this.alarms.max_gpu_load }








    /**
     * Checks if the GPU's temperature is within the acceptable range.
     * @returns boolean
     */
    private isGPUTemperatureAcceptable(): boolean { return this.gpu.temperatureGpu < this.alarms.max_gpu_temperature }







    /**
     * Checks if the GPU's memory's temperature is within the acceptable range.
     * @returns boolean
     */
     private isGPUMemoryTemperatureAcceptable(): boolean { return this.gpu.temperatureMemory < this.alarms.max_gpu_memory_temperature }













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
    private getAlarmsTable(): string { return this.testMode ? this._db.getTestTableName(this.alarmsTable): this.alarmsTable};
}