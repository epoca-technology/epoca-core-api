


/**
 * Universal Types
 */



// API Response
export interface IAPIResponse {
    success: boolean,
    data: any|null,
    error: IAPIError|null
}


// Error
export interface IAPIError {
    code: number,
    message: string
}