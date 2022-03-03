

// Service
export interface IIPBlacklistService {
    // Initialization
    initialize(): Promise<void>,

    // Retrievers
    getAll(): Promise<IIPBlacklistRecord[]>,

    // IP Status
    isIPBlacklisted(ip: string): void,

    // IP Management
    registerIP(ip: string, notes: string|undefined): Promise<void>,
    updateNotes(ip: string, notes: string): Promise<void>,
    unregisterIP(ip: string): Promise<void>,

    // Misc Helpers
    formatIP(ip: string): string,
}



// Model
export interface IIPBlacklistModel {
    // Retrievers
    getAll(): Promise<IIPBlacklistRecord[]>,
    get(ip: string): Promise<IIPBlacklistRecord|undefined>,

    // IP Management
    registerIP(ip: string, notes: string|undefined): Promise<void>,
    updateNotes(ip: string, notes: string): Promise<void>,
    unregisterIP(ip: string): Promise<void>,
}



// Validations
export interface IIPBlacklistValidations {
    canRegisterIP(ip: string, notes: string|undefined): Promise<void>,
    canUpdateNotes(ip: string, notes: string): Promise<void>,
    canUnregisterIP(ip: string): Promise<void>
}



// IP Blacklist Object
export interface IIPBlacklist {
    [ip: string]: boolean
}



// IP Record
export interface IIPBlacklistRecord {
    ip: string,     // The IP Being Blacklisted
    n?: string      // The notes regarding the IP Blacklist
    c: number,      // Creation Timestamp
}