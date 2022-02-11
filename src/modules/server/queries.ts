import { IServerAPIQueries } from "./interfaces";

export const queries: IServerAPIQueries = {
    system: 'manufacturer, model, version, sku',
    time: 'uptime',
    baseboard: 'manufacturer, model, version',
    bios: 'vendor, version, releaseDate, revision',
    osInfo: 'platform, distro, release, codename, kernel, arch, hostname, fqdn',
    versions: '*',
    networkInterfaces: 'iface, ifaceName, ip4, ip4subnet, ip6, ip6subnet',
    cpu: 'manufacturer, brand, vendor, family, model, speed, cores, physicalCores',
    cpuTemperature: 'main, cores, max, socket',
    graphics: 'controllers',
    fsSize: 'fs, type, size, used, available, mount',
    mem: 'total, free, used',
    currentLoad: 'avgLoad, currentLoad',
}