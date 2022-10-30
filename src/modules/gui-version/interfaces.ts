

// Service
export interface IGuiVersionService {
    // Properties
    activeVersion: string|undefined,

    // Methods
    get(): Promise<string>
    update(newVersion: string): Promise<void>
}