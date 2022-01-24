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
    networkInterfaces: [{
        iface: "Unknown",
        ifaceName: "Unknown",
        ip4: "Unknown",
        ip4subnet: "Unknown",
        ip6: "Unknown",
        ip6subnet: "Unknown"
    }],
    uptime: 0,
    lastResourceScan: 0,
    alarms: {
        max_file_system_usage: 80,
        max_memory_usage: 75,
        max_cpu_load: 75,
        max_cpu_temperature: 70,
        max_gpu_load: 75,
        max_gpu_temperature: 80,
        max_gpu_memory_temperature: 60
    },
    fileSystems: [{
        fs: "Unknown",
        type: "Unknown",
        size: 0,
        used: 0,
        available: 0,
        mount: "Unknown",
        usedPercent: 0
    }],
    memory: {
        total: 0,
        free: 0,
        used: 0,
        usedPercent: 0
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
    runningServices: []
}