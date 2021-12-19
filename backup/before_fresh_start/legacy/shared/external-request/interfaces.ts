import * as http from 'http';

// Service
export interface IExternalRequestService {
    request(options: IExternalRequestOptions, params?: any, protocolName?: IExternalRequestProtocolName): Promise<IExternalRequestResponse>
}



// Options
export type IExternalRequestOptions = http.RequestOptions;



// Response
export interface IExternalRequestResponse {
    statusCode: number,
    headers: http.IncomingHttpHeaders,
    data?: any
};



// Protocol
export type IExternalRequestProtocolName = 'http'|'https';