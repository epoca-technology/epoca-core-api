

// Service
export interface IServerService {
    // Properties
    alarmsTable: string,
    testMode: boolean,

    // Initializer
    initialize(): Promise<void>,

    // Alarms Management
    setAlarmsConfiguration(config: IAlarmsConfig): Promise<void>,
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



// Network Connection
export interface IServerNetworkConnection {
    protocol: string,
    localAddress: string,
    localPort: string,
    peerAddress: string,
    peerPort: string,
    state: string
}





/* Machine Resources & Monitoring */

// File System - Used for monitoring and only loads on init 
export interface IServerFileSystem {
    fs: string,
    type: string,
    size: number,       // Bytes converted into Gigabytes
    used: number,       // Bytes converted into Gigabytes
    available: number,  // Bytes converted into Gigabytes
    mount: string
}


// Memory - Used for monitoring and it is updated on every interval
export interface IServerMemory {
    total: number,  // Bytes converted into Gigabytes
    free: number,   // Bytes converted into Gigabytes
    used: number,   // Bytes converted into Gigabytes
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
    socket: string,
}


// CPU Temperature - Used for monitoring and it is updated on every interval
export interface IServerCPUTemperature {
    main: number,
    cores: number[],
    max: number,
    socket: number[],
    chipset: number
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





/* Alarms Config */
export interface IAlarmsConfig {
    maxFileSystemUsage: number,         // %
    maxMemoryUsage: number,             // %
    maxCPULoad: number,                 // %
    maxCPUTemperature: number,          // Celcius Degrees
    maxGPULoad: number,                 // %
    maxGPUTemperature: number,          // Celcius Degrees
    maxGPUMemoryTemperature: number,    // Celcius Degrees
}







/* Server Data */


// Info
export interface IServerInfo {
    system: IServerSystem,
    baseboard: IServerBaseBoard,
    bios: IServerBIOS,
    os: IServerOS,
    softwareVersions: IServerSoftwareVersions,
    networkConnections: IServerNetworkConnection[],
}


// Resources
export interface IServerResources {
    fileSystems: IServerFileSystem[],
    memory: IServerMemory,
    cpu: IServerCPU,
    cpuTemperature: IServerCPUTemperature,
    gpu: IServerGPU,
    lastResourceScan: number,
    alarms: IAlarmsConfig
}


// Server Data
export interface IServerData {
    info: IServerInfo,
    resources: IServerResources
}


// Default Data
export interface IDefaultData extends IServerInfo, IServerResources {
    
}