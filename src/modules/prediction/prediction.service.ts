import {inject, injectable} from "inversify";
import { environment, SYMBOLS } from "../../ioc";
import { IExternalRequestOptions, IExternalRequestResponse, IExternalRequestService } from "../external-request";
import { IAPIResponse, IUtilitiesService } from "../utilities";
import { IPredictionService } from "./interfaces";




@injectable()
export class PredictionService implements IPredictionService {
    // Inject dependencies
    @inject(SYMBOLS.ExternalRequestService)           private _req: IExternalRequestService;
    @inject(SYMBOLS.UtilitiesService)                 private _utils: IUtilitiesService;

    // HTTP options
    private options: IExternalRequestOptions = {
        host: 'prediction-api',
        path: '/',
        method: 'GET',
        port: 5000,
        headers: {
            'Content-Type': 'application/json',
            'secret-key': environment.FLASK_SECRET_KEY
        }
    }

    // Prediction Retriever
    private predictionInterval: any;
    private readonly intervalSeconds: number = 45 * 1000;
    private readonly secondsTolerance: number = 60;




    constructor() {}



    public async initialize(): Promise<void> {
        this.predictionInterval = setInterval(async () => {
            try {
                // Set the path
                this.options.path = '/';

                // Retrieve the chainlock status
                const response: IExternalRequestResponse = await this._req.request(this.options, {}, 'http');
                const apiResponse: IAPIResponse = response.data;

                // Validate the request data
                if (!apiResponse || typeof apiResponse != "object") {
                    console.log(response);
                    throw new Error(this._utils.buildApiError(`The Forecast API returned an invalid response.`, 0));
                }

                // Validate the response
                if (!apiResponse.success) throw new Error(apiResponse.error);

                console.log(`Prediction API: ${apiResponse.data}`);
            } catch (e) { 

            }
        }, this.intervalSeconds);
    }






    public stop(): void {
        if (this.predictionInterval) clearInterval(this.predictionInterval);
    }







    /**
     * ...
     */
    public async predict(): Promise<any> {
        return {}
    }







}