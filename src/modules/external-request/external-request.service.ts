import {injectable} from "inversify";
import {IExternalRequestProtocolName, IExternalRequestResponse, IExternalRequestService, IExternalRequestOptions } from "./interfaces";
import * as http from 'http';
import * as https from 'https';



@injectable()
export class ExternalRequestService implements IExternalRequestService {



    constructor() {}


    


    /**
     * Performs an HTTP/HTTPS based on provided parameters. The final response must be reviewed
     * as it can include errors thrown by the request recipient.
     * @param options 
     * @param params 
     * @param protocolName 
     * @returns Promise<IExternalRequestResponse>
     */
    public request(options: IExternalRequestOptions, params?: any, protocolName?: IExternalRequestProtocolName): Promise<IExternalRequestResponse> {
        return new Promise((resolve, reject) => {
            try {
                // Init the protocol to be used
                const protocol: any = protocolName == 'http' ? http: https;

                // Perform the request
                let request: http.ClientRequest = protocol.request(options, (response: http.IncomingMessage) => {
                    // Init response data
                    let data: string = '';
                    let finalResponse: IExternalRequestResponse = {
                        statusCode: response.statusCode,
                        headers: response.headers
                    };

                    // On data changes
                    response.on('data',  (chunk)=> {
                        data += chunk;
                    });

                    // Once it ends
                    response.on('end',  () => {
                        // Verify if data was included
                        if (!data) {
                            resolve(finalResponse);
                        } else {
                            try {
                                finalResponse.data = JSON.parse(data);
                                resolve(finalResponse);
                            }catch(err) {
                                finalResponse.data = data;
                                resolve(finalResponse);
                            }
                        }
                    });

                    // If there is an error
                    response.on('error',(err) => {
                        console.log(err);
                        reject(err);
                    })
                });

                // Append params if applicable
                const finalParams: string|undefined = this.getFinalParams(params);
                if (finalParams != undefined) request.write(params);

                // End request
                request.end();
            } catch (e) {
                console.log(e);
                reject(e);
            }
        });
    }








    /**
     * Given the params, it will attempt to convert it into a valid string based on 
     * the format
     * @param params 
     * @returns string|undefined
     */
    private getFinalParams(params?: any): string|undefined {
        // None provided
        if (!params) {
            return undefined;
        }

        // String Param
        else if (typeof params == "string") {
            return params;
        }

        // Object Param
        else if (typeof params == "object") {
            return JSON.stringify(params);
        }

        // Unknown format
        else {
            return String(params);
        }
    }
}