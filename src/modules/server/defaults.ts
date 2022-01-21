import { IDefaultData } from "./interfaces";

export const defaults: IDefaultData = {
    system: {
        manufacturer: "Unknown",
        model: "Unknown",
        version: "Unknown",
        sku: "Unknown"
    },
    baseboard: {
        manufacturer: "Unknown",
        model: "Unknown",
        version: "Unknown"
    },
    bios: {
        vendor: "Unknown",
        version: "Unknown",
        releaseDate: "Unknown",
        revision: "Unknown"
    },
    os: {
        platform: "Unknown",
        distro: "Unknown",
        release: "Unknown",
        codename: "Unknown",
        kernel: "Unknown",
        arch: "Unknown",
        hostname: "Unknown",
        fqdn: "Unknown"
    },
    softwareVersions: {},
    networkConnections: [{
        protocol: "Unknown",
        localAddress: "Unknown",
        localPort: "Unknown",
        peerAddress: "Unknown",
        peerPort: "Unknown",
        state: "Unknown"
    }],
    fileSystems: [{
        fs: "Unknown",
        type: "Unknown",
        size: 0,
        used: 0,
        available: 0,
        mount: "Unknown"
    }],
    memory: {
        total: 0,
        free: 0,
        used: 0
    },
    cpu: {
        manufacturer: "Unknown",
        brand: "Unknown",
        vendor: "Unknown",
        family: "Unknown",
        model: "Unknown",
        speed: 0,
        cores: 0,
        physicalCores: 0,
        socket: "Unknown",
    },
    cpuTemperature: {
        main: 0,
        cores: [],
        max: 0,
        socket: [],
        chipset: 0
    },
    gpu: {
        vendor: "Unknown",
        model: "Unknown",
        bus: "Unknown",
        utilizationGpu: 0,
        temperatureGpu: 0,
        temperatureMemory: 0,
    },
    lastResourceScan: 0,
    alarms: {
        maxFileSystemUsage: 80,
        maxMemoryUsage: 75,
        maxCPULoad: 75,
        maxCPUTemperature: 70,
        maxGPULoad: 75,
        maxGPUTemperature: 80,
        maxGPUMemoryTemperature: 60
    }
}