import { IAuthority } from "../auth";



// Request Guard
export interface IRequestGuardService {
    // Properties
    apiInitialized: boolean,
    
    // Authenticated Request
    validateRequest(
        idToken: string,
        apiSecret: string,
        clientIP: string,
        requiredAuthority: IAuthority,
        requiredParams?: string[],
        params?: object,
        otp?: string
    ): Promise<string>,

    // Public Request
    validatePublicRequest(
        clientIP: string,
        requiredParams?: string[],
        params?: object,
    ): void
}







