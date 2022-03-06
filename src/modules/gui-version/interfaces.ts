

export interface IGuiVersionService {
    get(): Promise<string>
    update(newVersion: string): Promise<void>
}