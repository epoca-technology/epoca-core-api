

// Service
export interface IServerService {
    // Properties
    testMode: boolean,

    // Retrievers
    getServerData(): IServerData,
    getServerInfo(): IServerInfo,
    getServerResources(): IServerResources,

    // Initializer
    initialize(): Promise<void>,

    // Alarms Management
    setAlarmsConfiguration(c?: IAlarmsConfig): Promise<void>,
}





// Validations
export interface IServerValidations {
    canSetAlarmsConfiguration(alarms: IAlarmsConfig): void
}







/* Machine General Info */

// System
export interface IServerSystem {
    manufacturer: string,
    model: string,
    version: string,
    sku: string,
}

// Base Board
export interface IServerBaseBoard {
    manufacturer: string,
    model: string,
    version: string
}

// BIOS
export interface IServerBIOS {
    vendor: string,
    version: string,
    releaseDate: string,
    revision: string,
}


// OS
export interface IServerOS {
    platform: string,
    distro: string,
    release: string,
    codename: string,
    kernel: string,
    arch: string,
    hostname: string,
    fqdn: string
}



// Software Versions
export interface IServerSoftwareVersions {
    [softwareName: string]: string
}



// Network Interface
export interface IServerNetworkInterface {
    iface: string,
    ifaceName: string,
    ip4: string,
    ip4subnet: string,
    ip6: string,
    ip6subnet: string
}





/* Machine Resources & Monitoring */

// File System - Used for monitoring and only loads on init 
export interface IServerFileSystem {
    fs: string,
    type: string,
    size: number,       // Bytes converted into Gigabytes
    used: number,       // Bytes converted into Gigabytes
    available: number,  // Bytes converted into Gigabytes
    mount: string,
    usedPercent: number, // Populated in the service
}


// Memory - Used for monitoring and it is updated on every interval
export interface IServerMemory {
    total: number,  // Bytes converted into Gigabytes
    free: number,   // Bytes converted into Gigabytes
    used: number,   // Bytes converted into Gigabytes
    usedPercent: number, // Populated in the service
}


// CPU
export interface IServerCPU {
    manufacturer: string,
    brand: string,
    vendor: string,
    family: string,
    model: string,
    speed: number,          // GHz
    cores: number,          // Number of physical cores times the number of threads that can run on each core through the use of hyperthreading
    physicalCores: number,  // Actual physical cores
}


// CPU Temperature - Used for monitoring and it is updated on every interval
export interface IServerCPUTemperature {
    main: number,
    cores: number[],
    max: number,
    socket: number[],
    chipset: number
}


// Server CPU Load
export interface IServerCPULoad {
    avgLoad: number,
    currentLoad: number
}


// GPU - Used for monitoring and it is updated on every interval
export interface IServerGPU {
    vendor: string,
    model: string,
    bus: string,
    utilizationGpu: number,
    temperatureGpu: number,
    temperatureMemory: number,
}



// Running Service
export interface IServerRunningService {
    name: string,
    running: boolean,
    pids: number[],
    cpu: number,
    mem: number
}








/* System Information API Queries */
export interface IServerAPIQueries {
    system: string,
    time: string,
    baseboard: string,
    bios: string,
    osInfo: string,
    versions: string,
    networkInterfaces: string,
    cpu: string,
    cpuTemperature: string,
    graphics: string,
    fsSize: string,
    mem: string,
    currentLoad: string,
    services: string,
}







/* Alarms Config */
export interface IAlarmsConfig {
    max_file_system_usage: number,        // %
    max_memory_usage: number,             // %
    max_cpu_load: number,                 // %
    max_cpu_temperature: number,          // Celcius Degrees
    max_gpu_load: number,                 // %
    max_gpu_temperature: number,          // Celcius Degrees
    max_gpu_memory_temperature: number,   // Celcius Degrees
}













/* Server Data */


// Info
export interface IServerInfo {
    system: IServerSystem,
    baseboard: IServerBaseBoard,
    bios: IServerBIOS,
    os: IServerOS,
    softwareVersions: IServerSoftwareVersions,
    networkInterfaces: IServerNetworkInterface[],
    cpu: IServerCPU,
}


// Resources
export interface IServerResources {
    uptime: number,
    lastResourceScan: number,
    alarms: IAlarmsConfig,
    fileSystems: IServerFileSystem[],
    memory: IServerMemory,
    cpuTemperature: IServerCPUTemperature,
    gpu: IServerGPU,
    runningServices: IServerRunningService[],
    cpuLoad: IServerCPULoad
}


// Server Data
export interface IServerData {
    info: IServerInfo,
    resources: IServerResources
}


// Default Data
export interface IDefaultData extends IServerInfo, IServerResources {
    
}