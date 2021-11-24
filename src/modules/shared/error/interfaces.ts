export interface IErrorService {
    handle(data?: any): void,
    getMessage(e: any): string
}